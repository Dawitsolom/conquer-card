import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { verifyIdToken } from "../lib/firebase";
import redis, { Keys, getGameState, setGameState } from "../lib/redis";
import { settleRound } from "../lib/coinLedger";
import { isBotTurn, takeBotTurn } from "../botAI";
import {
  dealCards,
  validateAction,
  applyAction,
  checkWinCondition,
  calculatePayout,
  handleTimeout,
} from "@conquer-card/engine";
import type {
  GameState,
  GameAction,
  TableConfig,
  DiscardAction,
  PlayerStatus,
} from "@conquer-card/engine";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
} from "@conquer-card/contracts";
import type {
  ClientGameState,
  JoinTablePayload,
  ReadyPayload,
  GameActionPayload,
  LeaveTablePayload,
  EmojiPayload,
  CameraTogglePayload,
} from "@conquer-card/contracts";

// =============================================================================
// gameEvents.ts  —  Socket.io event handlers
//
// CRITICAL rules (CLAUDE.md):
//   1. NEVER send opponent hand cards — replace with handCount
//   2. Turn timer runs SERVER-SIDE — never trust client timing
//   3. All coin operations use Prisma transactions
//   4. Rate limit game:action to max 5 per second per player
//   5. Server validates every action — client is a view, not a brain
//
// Java analogy: this file is the GameController + WebSocketHandler combo.
// registerAuthMiddleware() is the authentication filter (like a servlet filter).
// registerGameEvents() wires all handlers on a single socket connection.
// =============================================================================

// ── Augment Socket with auth fields ──────────────────────────────────────────

interface AuthSocket extends Socket {
  userId: string;       // Prisma User.id (UUID)
  displayName: string;
}

// ── Server-side in-memory state ───────────────────────────────────────────────
// Java analogy: static fields on the singleton GameService bean.

/** NodeJS.Timeout handles for each active turn. tableId → timer */
const turnTimers = new Map<string, NodeJS.Timeout>();

/** NodeJS.Timeout handles for each disconnected player. userId → timer */
const disconnectTimers = new Map<string, NodeJS.Timeout>();

/** Rate-limit counters. socketId → { count, windowStart ms } */
const rateLimit = new Map<string, { count: number; windowStart: number }>();

/** Previous player status before a disconnect, so we can restore it on reconnect */
const prevStatus = new Map<string, PlayerStatus>(); // userId → status

// ── Constants ─────────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX      = 5;           // max actions/second (CLAUDE.md rule 6)
const TURN_TIMEOUT_MS     = 30_000;      // 30 seconds (Tech Spec §4.4)
const RECONNECT_WINDOW_MS = 60_000;      // 60-second grace window (Tech Spec §4.3)

// ── Auth middleware ───────────────────────────────────────────────────────────

/**
 * Call this once on the io Server instance before registerGameEvents.
 * Verifies the Firebase ID token sent in socket.handshake.auth.token.
 * Attaches userId + displayName to the socket for use in all handlers.
 *
 * Java analogy: a servlet filter that populates SecurityContext.
 */
export function registerAuthMiddleware(io: Server): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = await verifyIdToken(token);
      const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
      if (!user) return next(new Error("User not found — complete sign-up first"));
      const s = socket as AuthSocket;
      s.userId      = user.id;
      s.displayName = user.displayName;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });
}

// ── State sanitization ────────────────────────────────────────────────────────

/**
 * NEVER send full GameState to clients.
 * Rules (Tech Spec §4.2):
 *   - Each opponent's `hand` is replaced with `handCount`
 *   - `drawPile` contents are hidden — only length is sent
 *
 * Java analogy: a DTO mapper / JSON view (@JsonView).
 */
function sanitizeForPlayer(state: GameState, receiverUserId: string): ClientGameState {
  const { drawPile, ...rest } = state;
  return {
    ...rest,
    drawPileCount: drawPile.length,
    players: state.players.map(p => {
      if (p.id === receiverUserId) return p; // receiver sees their own hand in full
      const { hand, ...playerRest } = p;
      return { ...playerRest, handCount: hand.length };
    }),
  };
}

/**
 * Emit a personalised sanitized state to every player in the table.
 * Each player gets only their own hand — opponents' cards are hidden.
 *
 * Uses per-player rooms (socket joined `user:{userId}` on connect)
 * so we can target each player without fetching all sockets.
 */
async function broadcastState(io: Server, state: GameState): Promise<void> {
  for (const player of state.players) {
    io.to(`user:${player.id}`).emit(
      SERVER_EVENTS.STATE_UPDATE,
      sanitizeForPlayer(state, player.id),
    );
  }
}

// ── Turn timer ────────────────────────────────────────────────────────────────

function clearTurnTimer(tableId: string): void {
  const t = turnTimers.get(tableId);
  if (t) { clearTimeout(t); turnTimers.delete(tableId); }
}

/**
 * Start (or restart) the 30-second turn clock for the active player.
 * On expiry: calls engine's handleTimeout(), broadcasts result, restarts timer.
 *
 * Java analogy: ScheduledExecutorService.schedule(Runnable, 30, TimeUnit.SECONDS)
 */
function startTurnTimer(io: Server, tableId: string, state: GameState): void {
  clearTurnTimer(tableId);

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.status === "disconnected") return;

  const timeoutAt = state.turnStartedAt + TURN_TIMEOUT_MS;
  io.to(tableId).emit(SERVER_EVENTS.TURN_CHANGED, { activePlayerId: activePlayer.id, timeoutAt });

  // Store expiry in Redis so reconnecting clients know time remaining
  void redis.set(Keys.turnTimer(tableId), String(timeoutAt), "EX", 35);

  const delay = Math.max(0, timeoutAt - Date.now());
  const timer = setTimeout(async () => {
    const current = await getGameState(tableId);
    if (!current || current.phase !== "active") return;

    const timedOutPlayer = current.players[current.activePlayerIndex];
    if (!timedOutPlayer) return;

    // Bot player: execute a full bot turn instead of simple auto-draw/discard
    if (isBotTurn(current)) {
      await takeBotTurn(io, tableId);
      const afterBot = await getGameState(tableId);
      if (afterBot && afterBot.phase === "active") startTurnTimer(io, tableId, afterBot);
      return;
    }

    // Human player timed out: engine auto-draws and discards
    const newState = handleTimeout(current);
    await setGameState(tableId, newState);

    io.to(tableId).emit(SERVER_EVENTS.TURN_TIMEOUT, { playerId: timedOutPlayer.id });
    await broadcastState(io, newState);
    startTurnTimer(io, tableId, newState);
  }, delay);

  turnTimers.set(tableId, timer);
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/** Returns true if this socket has exceeded 5 actions/second. */
function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(socketId);
  if (!entry || now - entry.windowStart >= 1000) {
    rateLimit.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}


// ── Main handler registration ─────────────────────────────────────────────────

/**
 * Called once per socket connection from src/index.ts:
 *   io.on("connection", (socket) => registerGameEvents(io, socket));
 */
export function registerGameEvents(io: Server, socket: Socket): void {
  const s = socket as AuthSocket;

  // Each socket joins a personal room so broadcastState() can target them individually
  void socket.join(`user:${s.userId}`);

  // ── table:join ──────────────────────────────────────────────────────────────
  socket.on(CLIENT_EVENTS.JOIN_TABLE, async (data: JoinTablePayload) => {
    const { tableId } = data;
    try {
      const table = await prisma.table.findUnique({ where: { id: tableId } });
      if (!table)                    { socket.emit(SERVER_EVENTS.ERROR, { message: "Table not found" }); return; }
      if (table.status === "CLOSED") { socket.emit(SERVER_EVENTS.ERROR, { message: "Table is closed" }); return; }

      await socket.join(tableId);
      await redis.set(Keys.userSession(s.userId), socket.id, "EX", 300);

      // Check for active game — this might be a reconnect
      const existing = await getGameState(tableId);
      if (existing) {
        const playerInGame = existing.players.find(p => p.id === s.userId);
        if (playerInGame) {
          // Reconnect: cancel forfeit timer + restore previous status
          const reconnectTimer = disconnectTimers.get(s.userId);
          if (reconnectTimer) { clearTimeout(reconnectTimer); disconnectTimers.delete(s.userId); }

          const restored = prevStatus.get(s.userId) ?? "unopened";
          prevStatus.delete(s.userId);

          const updated: GameState = {
            ...existing,
            players: existing.players.map(p =>
              p.id === s.userId ? { ...p, status: restored } : p,
            ),
          };
          await setGameState(tableId, updated);
          io.to(tableId).emit(SERVER_EVENTS.PLAYER_RECONNECTED, { playerId: s.userId });
          socket.emit(SERVER_EVENTS.STATE_UPDATE, sanitizeForPlayer(updated, s.userId));
          return;
        }
      }

      io.to(tableId).emit(SERVER_EVENTS.PLAYER_JOINED, {
        playerId: s.userId,
        displayName: s.displayName,
      });
    } catch (err) {
      console.error("[table:join]", err);
      socket.emit(SERVER_EVENTS.ERROR, { message: "Failed to join table" });
    }
  });

  // ── player:ready ─────────────────────────────────────────────────────────────
  // When the host emits ready, fetch all sockets in the room and deal cards.
  socket.on(CLIENT_EVENTS.READY, async (data: ReadyPayload) => {
    const { tableId } = data;
    try {
      const table = await prisma.table.findUnique({ where: { id: tableId } });
      if (!table) { socket.emit(SERVER_EVENTS.ERROR, { message: "Table not found" }); return; }
      // Private tables: only the host can start. Public tables (hostUserId null): any player can start.
      if (table.isPrivate && table.hostUserId !== s.userId) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Only the host can start the round" });
        return;
      }

      // Collect players currently in the room
      const socketsInRoom  = await io.in(tableId).fetchSockets();
      const playerIds      = socketsInRoom.map(sock => (sock as unknown as AuthSocket).userId);

      if (playerIds.length < 2) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Need at least 2 players" });
        return;
      }

      // Fetch display names + coin balances from DB
      const users = await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, displayName: true, coinBalance: true },
      });
      const displayNames: string[] = playerIds.map(
        uid => users.find(u => u.id === uid)?.displayName ?? "Player",
      );
      const coinBalances: Record<string, number> = Object.fromEntries(
        users.map(u => [u.id, u.coinBalance]),
      );

      const config: TableConfig = {
        jokerCount:         table.jokerCount as 0 | 2 | 4,
        sequencesOnlyMode:  table.sequencesOnly,
        betAmount:          table.betAmount,
        turnTimeoutSeconds: 30,
      };

      // Find existing open round or create one
      let round = await prisma.round.findFirst({
        where: { tableId, endedAt: null },
        orderBy: { roundNumber: "desc" },
      });
      const roundNumber = round ? round.roundNumber : 1;
      if (!round) {
        round = await prisma.round.create({
          data: {
            tableId,
            roundNumber,
            betAmount: table.betAmount,
            playerCount: playerIds.length,
          },
        });
        for (const uid of playerIds) {
          await prisma.gamePlayer.create({ data: { userId: uid, roundId: round.id } });
        }
      }

      await prisma.table.update({ where: { id: tableId }, data: { status: "ACTIVE" } });

      const dealerIndex = (roundNumber - 1) % playerIds.length; // rotate dealer each round
      const state = dealCards(
        tableId, playerIds, displayNames, dealerIndex, config, coinBalances, roundNumber,
      );

      await setGameState(tableId, state);
      io.to(tableId).emit(SERVER_EVENTS.ROUND_START, { roundNumber, dealerIndex });
      await broadcastState(io, state);
      startTurnTimer(io, tableId, state);
    } catch (err) {
      console.error("[player:ready]", err);
      socket.emit(SERVER_EVENTS.ERROR, { message: "Failed to start round" });
    }
  });

  // ── game:action ──────────────────────────────────────────────────────────────
  // Client sends: GameAction & { tableId: string }
  // Server overrides playerId with the authenticated userId — never trust client.
  socket.on(CLIENT_EVENTS.GAME_ACTION, async (payload: GameActionPayload) => {
    if (isRateLimited(socket.id)) {
      socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: "Rate limit exceeded — max 5 actions/second" });
      return;
    }

    const { tableId, ...actionRaw } = payload;
    if (!tableId) {
      socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: "Missing tableId in action payload" });
      return;
    }

    // Override playerId with authenticated userId (CLAUDE.md rule 5)
    const action: GameAction = { ...actionRaw, playerId: s.userId } as GameAction;

    try {
      const state = await getGameState(tableId);
      if (!state) { socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: "No active game found" }); return; }

      const validation = validateAction(state, action);
      if (!validation.valid) {
        socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: validation.reason });
        return;
      }

      clearTurnTimer(tableId);
      const newState = applyAction(state, action);

      // Check for win immediately after a DISCARD
      if (action.type === "DISCARD") {
        const winType = checkWinCondition(newState, s.userId, (action as DiscardAction).card);
        if (winType) {
          const allPlayerIds = newState.players.map(p => p.id);
          const payouts      = calculatePayout(newState.betAmount, winType, s.userId, allPlayerIds);
          const finalState: GameState = { ...newState, phase: "round_over" };

          await setGameState(tableId, finalState);
          await broadcastState(io, finalState);
          io.to(tableId).emit(SERVER_EVENTS.ROUND_OVER, { winnerId: s.userId, winType, payouts });

          void settleRound(tableId, allPlayerIds, s.userId, winType, payouts).catch(
            err => console.error("[settleRound]", err),
          );
          return;
        }
      }

      // Normal action — persist, broadcast, restart timer
      await setGameState(tableId, newState);
      await broadcastState(io, newState);
      startTurnTimer(io, tableId, newState);
    } catch (err) {
      console.error("[game:action]", err);
      socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: "Server error processing action" });
    }
  });

  // ── table:leave ──────────────────────────────────────────────────────────────
  socket.on(CLIENT_EVENTS.LEAVE_TABLE, async (data: LeaveTablePayload) => {
    const { tableId } = data;
    try {
      await socket.leave(tableId);
      await redis.del(Keys.userSession(s.userId));
      io.to(tableId).emit(SERVER_EVENTS.PLAYER_LEFT, { playerId: s.userId });
    } catch (err) {
      console.error("[table:leave]", err);
    }
  });

  // ── player:emoji ─────────────────────────────────────────────────────────────
  socket.on(CLIENT_EVENTS.EMOJI, (data: EmojiPayload) => {
    io.to(data.tableId).emit(SERVER_EVENTS.EMOJI_REACTION, {
      playerId: s.userId,
      emoji:    data.emoji,
    });
  });

  // ── player:camera_toggle ─────────────────────────────────────────────────────
  socket.on(CLIENT_EVENTS.CAMERA_TOGGLE, async (data: CameraTogglePayload) => {
    const { tableId, cameraOn } = data;
    try {
      const state = await getGameState(tableId);
      if (!state) return;
      const updated: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === s.userId ? { ...p, cameraOn } : p,
        ),
      };
      await setGameState(tableId, updated);
      await broadcastState(io, updated);
    } catch (err) {
      console.error("[player:camera_toggle]", err);
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    rateLimit.delete(socket.id);
    await redis.del(Keys.userSession(s.userId));

    // All rooms except the socket's own ID room
    const joinedRooms = Array.from(socket.rooms).filter(r => r !== socket.id && !r.startsWith("user:"));

    for (const tableId of joinedRooms) {
      const state = await getGameState(tableId);
      if (!state) continue;

      const player = state.players.find(p => p.id === s.userId);
      if (!player) continue;

      // Save status so we can restore it on reconnect
      prevStatus.set(s.userId, player.status);

      const updated: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === s.userId ? { ...p, status: "disconnected" } : p,
        ),
      };
      await setGameState(tableId, updated);

      const reconnectDeadline = Date.now() + RECONNECT_WINDOW_MS;
      io.to(tableId).emit(SERVER_EVENTS.PLAYER_DISCONNECTED, {
        playerId: s.userId,
        reconnectDeadline,
      });

      // 60-second countdown — forfeit if they don't reconnect
      const timer = setTimeout(async () => {
        disconnectTimers.delete(s.userId);
        prevStatus.delete(s.userId);
        const current = await getGameState(tableId);
        if (!current) return;
        // Player forfeited — remove from game and notify table
        const forfeited: GameState = {
          ...current,
          players: current.players.filter(p => p.id !== s.userId),
        };
        await setGameState(tableId, forfeited);
        io.to(tableId).emit(SERVER_EVENTS.PLAYER_LEFT, { playerId: s.userId, forfeited: true });
      }, RECONNECT_WINDOW_MS);

      disconnectTimers.set(s.userId, timer);
    }
  });
}

import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import redis, { Keys, getGameState } from "../lib/redis";

// =============================================================================
// routes/tables.ts  —  All /tables/* REST endpoints
//
// Tech Spec §4.1:
//   GET  /tables/public            — list open public tables by bet tier
//   POST /tables/create            — create private table, returns roomCode
//   POST /tables/:tableId/join     — join by tableId or room code
//   GET  /tables/:tableId/state    — current GameState snapshot (for reconnect)
//
// Java analogy: @RestController @RequestMapping("/tables")
// =============================================================================

const router = Router();

// All table routes require authentication
router.use(authMiddleware);

// ── GET /tables/public ────────────────────────────────────────────────────────
// Returns open public tables grouped by bet tier so the lobby can show tiers.
// A table is "joinable" when: status=WAITING and playerCount < 4.
router.get("/public", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tables = await prisma.table.findMany({
      where:   { isPrivate: false, status: "WAITING" },
      orderBy: { createdAt: "asc" },
      select: {
        id:           true,
        betAmount:    true,
        jokerCount:   true,
        sequencesOnly:true,
        createdAt:    true,
        _count:       { select: { rounds: true } },
      },
    });

    // Count current players via Redis game state (live count)
    const enriched = await Promise.all(
      tables.map(async (table) => {
        const state      = await getGameState(table.id);
        const playerCount = state ? state.players.length : 0;
        return { ...table, playerCount, maxPlayers: 4 };
      }),
    );

    // Only show tables with available seats
    const available = enriched.filter(t => t.playerCount < 4);
    res.json(available);
  } catch (err) {
    console.error("[GET /tables/public]", err);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// ── POST /tables/create ───────────────────────────────────────────────────────
// Creates a private table or a solo (vs-bots) table.
// isSolo=true: betAmount must be 0, no coin check, bots join automatically via socket.
router.post("/create", async (req: AuthRequest, res: Response): Promise<void> => {
  const { betAmount, jokerCount = 4, sequencesOnly = false, isSolo = false } = req.body as {
    betAmount: number;
    jokerCount?: 0 | 2 | 4;
    sequencesOnly?: boolean;
    isSolo?: boolean;
  };

  if (isSolo) {
    // Solo mode: no coin wager, start immediately
    if (betAmount !== 0) {
      res.status(400).json({ error: "Solo mode requires betAmount: 0" });
      return;
    }
  } else {
    if (!betAmount || betAmount < 1) {
      res.status(400).json({ error: "betAmount is required and must be at least 1" });
      return;
    }
    if (![0, 2, 4].includes(jokerCount)) {
      res.status(400).json({ error: "jokerCount must be 0, 2, or 4" });
      return;
    }
    // Check host has enough coins for real-money tables
    const host = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { coinBalance: true },
    });
    if (!host || host.coinBalance < betAmount) {
      res.status(400).json({ error: "Insufficient coin balance" });
      return;
    }
  }

  try {
    // Generate a unique 6-char room code (retry on collision)
    let roomCode: string;
    let attempts = 0;
    do {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await prisma.table.findUnique({ where: { roomCode } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const table = await prisma.table.create({
      data: {
        isPrivate:     true,
        isSolo,
        roomCode,
        betAmount,
        jokerCount,
        sequencesOnly,
        hostUserId:    req.user!.id,
        status:        "WAITING",
      },
    });

    // Store room code → tableId mapping in Redis for fast socket lookups
    await redis.set(Keys.roomCode(roomCode), table.id);

    res.status(201).json({ tableId: table.id, roomCode, isSolo });
  } catch (err) {
    console.error("[POST /tables/create]", err);
    res.status(500).json({ error: "Failed to create table" });
  }
});

// ── POST /tables/:tableId/join ────────────────────────────────────────────────
// Join a table by tableId (direct) or roomCode (from invite link).
// Returns the tableId so the client can connect the socket.
router.post("/:tableId/join", async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomCode } = req.body as { roomCode?: string };
  let tableId = req.params["tableId"] as string;

  try {
    // If a room code was provided, resolve it to a tableId
    if (roomCode) {
      const resolved = await redis.get(Keys.roomCode(roomCode));
      if (!resolved) {
        res.status(404).json({ error: "Room code not found or expired" });
        return;
      }
      tableId = resolved;
    }

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table)                    { res.status(404).json({ error: "Table not found" }); return; }
    if (table.status === "CLOSED") { res.status(400).json({ error: "Table is closed" }); return; }
    if (table.status === "ACTIVE") { res.status(400).json({ error: "Round already in progress" }); return; }

    // Check player has enough coins for the bet
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { coinBalance: true },
    });
    if (!user || user.coinBalance < table.betAmount) {
      res.status(400).json({ error: "Insufficient coins to join this table" });
      return;
    }

    // Check table isn't full (max 4 players)
    const state = await getGameState(tableId);
    if (state && state.players.length >= 4) {
      res.status(400).json({ error: "Table is full" });
      return;
    }

    res.json({ tableId, betAmount: table.betAmount, jokerCount: table.jokerCount, sequencesOnly: table.sequencesOnly });
  } catch (err) {
    console.error("[POST /tables/:tableId/join]", err);
    res.status(500).json({ error: "Failed to join table" });
  }
});

// ── GET /tables/:tableId/state ────────────────────────────────────────────────
// Returns the current sanitized GameState for reconnecting clients.
// Called by the mobile app after a network drop before the socket reconnects.
router.get("/:tableId/state", async (req: AuthRequest, res: Response): Promise<void> => {
  const tableId = req.params["tableId"] as string;
  try {
    const state = await getGameState(tableId);
    if (!state) { res.status(404).json({ error: "No active game at this table" }); return; }

    const playerId = req.user!.id;
    const inGame   = state.players.find(p => p.id === playerId);
    if (!inGame)   { res.status(403).json({ error: "You are not in this game" }); return; }

    // Sanitize — same rule as Socket.io: never send opponent hands
    const { drawPile, ...rest } = state;
    const sanitized = {
      ...rest,
      drawPileCount: drawPile.length,
      players: state.players.map(p => {
        if (p.id === playerId) return p;
        const { hand, ...playerRest } = p;
        return { ...playerRest, handCount: hand.length };
      }),
    };

    res.json(sanitized);
  } catch (err) {
    console.error("[GET /tables/:tableId/state]", err);
    res.status(500).json({ error: "Failed to fetch game state" });
  }
});

export default router;

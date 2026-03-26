import { Server } from "socket.io";
import { getGameState, setGameState } from "./lib/redis";
import {
  validateAction,
  applyAction,
  validateMeld,
  meetsOpeningThreshold,
  calculateMeldValue,
} from "@conquer-card/engine";
import type {
  GameState,
  Card,
  GameAction,
  Player,
} from "@conquer-card/engine";

// =============================================================================
// botAI.ts  —  Conservative random bot for disconnected player seats
//
// Tech Spec §8 / CLAUDE.md:
//   "Conservative random bot for empty seats only"
//   Bot takes over when a player disconnects (60-second grace window started).
//
// Strategy (conservative):
//   1. Always draw from deck (never pick up the discard pile)
//   2. Lay melds if the hand contains valid sets/sequences
//      — unopened players only lay if they reach the 41-pt opening threshold
//   3. Discard the highest point-value card that is NOT part of any meld group
//
// Java analogy: a simple AI Strategy implementation — like a plug-in
// BotStrategy interface with a single executeTurn(GameState, playerId) method.
// =============================================================================

// ── Point values (mirrors engine's POINT_VALUE in meld.ts) ───────────────────

const POINT_VALUE: Record<string, number> = {
  A: 11, '10': 10, J: 10, Q: 10, K: 10,
  '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9,
  JOKER: 0,
};

function cardPoints(card: Card): number {
  return POINT_VALUE[card.rank] ?? 0;
}

// ── Meld detection ────────────────────────────────────────────────────────────

/**
 * Find all valid 3-card sets in the hand.
 * A set: 3 cards of the same rank, different suits.
 * Java analogy: a greedy search over combinations.
 */
function findSets(hand: Card[]): Card[][] {
  const sets: Card[][] = [];
  const byRank = new Map<string, Card[]>();
  for (const card of hand) {
    if (card.rank === "JOKER") continue;
    const group = byRank.get(card.rank) ?? [];
    group.push(card);
    byRank.set(card.rank, group);
  }
  for (const [, cards] of byRank) {
    if (cards.length >= 3) {
      // Try all 3-card combos; take the first valid one
      for (let i = 0; i < cards.length - 2; i++) {
        for (let j = i + 1; j < cards.length - 1; j++) {
          for (let k = j + 1; k < cards.length; k++) {
            const combo = [cards[i], cards[j], cards[k]];
            if (validateMeld(combo, "set", false).valid) {
              sets.push(combo);
            }
          }
        }
      }
    }
  }
  return sets;
}

/**
 * Find all valid 3-card sequences in the hand.
 * A sequence: 3 consecutive cards of the same suit.
 */
function findSequences(hand: Card[], sequencesOnlyMode: boolean): Card[][] {
  const seqs: Card[][] = [];
  const bySuit = new Map<string, Card[]>();
  for (const card of hand) {
    if (card.rank === "JOKER") continue;
    const group = bySuit.get(card.suit) ?? [];
    group.push(card);
    bySuit.set(card.suit, group);
  }

  const rankOrder: Record<string, number> = {
    A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
  };

  for (const [, cards] of bySuit) {
    const sorted = [...cards].sort((a, b) => (rankOrder[a.rank] ?? 0) - (rankOrder[b.rank] ?? 0));
    for (let i = 0; i < sorted.length - 2; i++) {
      const combo = [sorted[i], sorted[i + 1], sorted[i + 2]];
      if (validateMeld(combo, "sequence", sequencesOnlyMode).valid) {
        seqs.push(combo);
      }
    }
  }
  return seqs;
}

/**
 * Choose which melds to lay this turn.
 * Returns an array of card groups — each group is one meld action.
 *
 * Conservative rule: only lay if the player is already opened,
 * OR the melds are worth enough to open (41+ pts or 3+ melds).
 */
function chooseMeldsToLay(
  player: Player,
  state: GameState,
): { cards: Card[]; meldType: "set" | "sequence" }[] {
  const sets      = findSets(player.hand);
  const sequences = findSequences(player.hand, state.sequencesOnlyMode);
  const candidates = [
    ...sets.map(c => ({ cards: c, meldType: "set" as const })),
    ...sequences.map(c => ({ cards: c, meldType: "sequence" as const })),
  ];

  if (candidates.length === 0) return [];

  // Already opened: lay everything we can
  if (player.status === "opened" || player.status === "finishing") {
    return candidates;
  }

  // Unopened: only open if threshold met
  const cardGroups = candidates.map(m => m.cards);
  if (meetsOpeningThreshold(cardGroups)) {
    return candidates;
  }

  return [];
}

/**
 * Choose the best card to discard.
 * Discard the highest point-value card that is NOT part of any meld in hand.
 * Never discard a Joker (engine will reject it anyway).
 */
function chooseDiscard(player: Player, state: GameState): Card | null {
  const inMeld = new Set<string>();
  const sets      = findSets(player.hand);
  const sequences = findSequences(player.hand, state.sequencesOnlyMode);
  for (const meld of [...sets, ...sequences]) {
    for (const card of meld) inMeld.add(card.id);
  }

  const discardable = player.hand
    .filter(c => c.rank !== "JOKER" && !inMeld.has(c.id))
    .sort((a, b) => cardPoints(b) - cardPoints(a)); // highest value first

  return discardable[0] ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the active player is a bot. */
export function isBotTurn(state: GameState): boolean {
  const player = state.players[state.activePlayerIndex];
  return !!player?.isBot;
}

/**
 * Execute a full bot turn: draw → lay melds → discard.
 * Applies each action via the engine's validateAction + applyAction,
 * persists to Redis, and broadcasts to all players after each step.
 *
 * Called from gameEvents.ts turn-timer callback when isBotTurn() is true.
 *
 * Java analogy: BotController.executeTurn(GameState) — a sequence of
 * validated state transitions, just like a real player's moves.
 */
export async function takeBotTurn(
  io: Server,
  tableId: string,
): Promise<void> {
  let state = await getGameState(tableId);
  if (!state || state.phase !== "active") return;

  const player = state.players[state.activePlayerIndex];
  if (!player?.isBot) return;

  const botId = player.id;

  // ── Step 1: Draw from deck ────────────────────────────────────────────────
  const drawAction: GameAction = { type: "DRAW_FROM_DECK", playerId: botId };
  const drawValidation = validateAction(state, drawAction);
  if (!drawValidation.valid) return; // deck empty or not bot's turn

  state = applyAction(state, drawAction);
  await setGameState(tableId, state);
  broadcastState(io, state);

  // ── Step 2: Lay melds if possible ─────────────────────────────────────────
  // Re-fetch the updated player (hand now has the drawn card)
  const updatedPlayer = state.players.find(p => p.id === botId);
  if (!updatedPlayer) return;

  const meldsToLay = chooseMeldsToLay(updatedPlayer, state);
  for (const { cards, meldType } of meldsToLay) {
    const meldAction: GameAction = { type: "LAY_MELD", playerId: botId, cards, meldType };
    const meldValidation = validateAction(state, meldAction);
    if (!meldValidation.valid) continue;
    state = applyAction(state, meldAction);
    await setGameState(tableId, state);
    broadcastState(io, state);
  }

  // ── Step 3: Discard ───────────────────────────────────────────────────────
  const currentPlayer = state.players.find(p => p.id === botId);
  if (!currentPlayer) return;

  const cardToDiscard = chooseDiscard(currentPlayer, state);
  if (!cardToDiscard) return;

  const discardAction: GameAction = { type: "DISCARD", playerId: botId, card: cardToDiscard };
  const discardValidation = validateAction(state, discardAction);
  if (!discardValidation.valid) return;

  state = applyAction(state, discardAction);
  await setGameState(tableId, state);
  broadcastState(io, state);
}

// ── Internal broadcast helper ─────────────────────────────────────────────────
// Mirrors sanitizeForPlayer from gameEvents.ts — kept local to avoid circular imports.

function broadcastState(io: Server, state: GameState): void {
  for (const player of state.players) {
    const { drawPile, ...rest } = state;
    const sanitized = {
      ...rest,
      drawPileCount: drawPile.length,
      players: state.players.map(p => {
        if (p.id === player.id) return p;
        const { hand, ...playerRest } = p;
        return { ...playerRest, handCount: hand.length };
      }),
    };
    io.to(`user:${player.id}`).emit("game:state_update", sanitized);
  }
}

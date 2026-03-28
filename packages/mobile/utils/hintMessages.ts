// =============================================================================
// hintMessages.ts — Compute contextual hint bar messages
//
// These messages are DISPLAY ONLY — they do not validate or enforce rules.
// Server validates everything; this just gives the player helpful guidance.
//
// Java analogy: a @Service that generates UI tooltip text from view-model state.
// =============================================================================

import { calculateMeldValue, meetsOpeningThreshold } from "@conquer-card/engine";
import type { Card, MeldType } from "@conquer-card/engine";
import type { OwnClientPlayer } from "@conquer-card/contracts";

export type HintContext = {
  myPlayer:      OwnClientPlayer | null;
  isMyTurn:      boolean;
  selectedCards: Card[];
  /** Detected meld type of the current selection (null = not a valid meld) */
  detectedMeldType: MeldType | null;
  /** Point value of selected cards (for opening threshold display) */
  selectedPoints: number;
  /** Number of complete melds currently selected */
  selectedMeldCount: number;
};

/**
 * Returns the hint bar message for the current game state.
 * Priority order: server rejection > selection-specific > phase-based.
 */
export function getHintMessage(
  ctx: HintContext,
  lastRejectionReason: string | null,
): string {
  // Server rejection always wins — shown for 3 s then auto-cleared
  if (lastRejectionReason) return lastRejectionReason;

  if (!ctx.isMyTurn) return "";  // caller shows opponent name

  const { myPlayer, selectedCards } = ctx;
  if (!myPlayer) return "Waiting…";

  // No card drawn yet this turn
  if (myPlayer.status === "unopened" && myPlayer.hand.length === 13) {
    return "Tap the deck to draw a card";
  }

  // One card selected — check discard restrictions
  if (selectedCards.length === 1) {
    const card = selectedCards[0]!;

    if (card.rank === "JOKER") {
      if (myPlayer.status === "finishing") return "Discard your final card to win!";
      return "Jokers cannot be discarded — use it in a meld or save it to finish";
    }

    // Check if card fits player's own melds on the table
    const fitsOwnMeld = myPlayer.melds.some(meld =>
      couldExtendMeld(card, meld.cards),
    );
    if (fitsOwnMeld) return "That card fits your meld — add it there first";

    return "Tap Discard to discard the selected card";
  }

  // Multiple cards selected — show opening hint
  if (selectedCards.length >= 3) {
    if (ctx.selectedMeldCount >= 3) {
      return `${ctx.selectedMeldCount} melds ready — you can open!`;
    }
    if (ctx.selectedPoints >= 41) {
      return `${ctx.selectedPoints} points — you can open!`;
    }
    return `${ctx.selectedPoints} pts selected — need 41+ or 3 melds to open`;
  }

  // No selection — phase-based hints
  if (myPlayer.status === "unopened") {
    return "You need 41+ points or 3 melds to open";
  }
  if (myPlayer.status === "finishing") {
    return "Discard your final card to win!";
  }
  return "Add cards to melds or discard";
}

// ── Discard lock check ────────────────────────────────────────────────────────
// Returns the reason the discard button should be visually locked, or null.
// This does NOT prevent the emit — server will reject if the lock is bypassed.

export function getDiscardLockReason(
  myPlayer: OwnClientPlayer | null,
  selectedCard: Card | null,
): string | null {
  if (!selectedCard) return "Select a card to discard";
  if (!myPlayer)     return null;

  if (selectedCard.rank === "JOKER") {
    if (myPlayer.status === "finishing") return null;  // allowed as finisher
    return "Jokers cannot be discarded";
  }

  const fitsOwnMeld = myPlayer.melds.some(meld =>
    couldExtendMeld(selectedCard, meld.cards),
  );
  if (fitsOwnMeld) return "Card fits your meld — add it there first";

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Naively checks if `card` could extend `meld` (same rank for sets, adjacent for sequences).
 *  This is intentionally approximate — server does the real validation. */
function couldExtendMeld(card: Card, meldCards: Card[]): boolean {
  if (meldCards.length === 0) return false;
  const first = meldCards[0]!;

  // Set: all same rank
  if (meldCards.every(c => c.rank === first.rank)) {
    return card.rank === first.rank;
  }

  // Sequence: same suit, check adjacency at either end
  const suits = new Set(meldCards.map(c => c.suit));
  if (suits.size > 1) return false;  // mixed suit — not a sequence
  if (card.suit !== first.suit) return false;

  const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"] as const;
  type Rank = typeof RANKS[number];
  const rankIndex = (r: string) => RANKS.indexOf(r as Rank);
  const indices   = meldCards.map(c => rankIndex(c.rank)).filter(i => i >= 0).sort((a,b) => a-b);
  const cardIdx   = rankIndex(card.rank);
  if (cardIdx < 0) return false;

  return cardIdx === (indices[0]! - 1) || cardIdx === (indices[indices.length - 1]! + 1);
}

/** Compute total point value for a set of cards using the engine helper. */
export function computePoints(cards: Card[]): number {
  try { return calculateMeldValue(cards); } catch { return 0; }
}

/** Count how many complete 3-card groups exist in the selection. */
export function countMelds(cards: Card[]): number {
  if (cards.length < 3) return 0;
  // Very rough: group by rank for sets, assume sorted by suit for sequences.
  // Server validates; this is only for the opening hint display.
  const byRank = new Map<string, number>();
  for (const c of cards) byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1);
  let count = 0;
  for (const n of byRank.values()) count += Math.floor(n / 3);
  return count;
}

/** Detect probable meld type for a selection of cards. */
export function detectMeldType(cards: Card[]): MeldType | null {
  if (cards.length < 3) return null;
  const ranks = cards.map(c => c.rank);
  if (new Set(ranks).size === 1) return "set";
  const suits = new Set(cards.map(c => c.suit));
  if (suits.size === 1) return "sequence";
  return null;
}

import { Card, Rank, MeldType } from './types';

// =============================================================================
// meld.ts  -  validateMeld + calculateMeldValue
// Java analogy: a static utility class. Pure functions, no side effects.
// =============================================================================

const RANK_ORDER: Record<string, number> = {
  'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,
};

const POINT_VALUE: Record<string, number> = {
  'A':11,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'J':10,'Q':10,'K':10,'JOKER':0,
};

/** calculateMeldValue - Rules 2.2, 5.3
 *  Point total for the 41-pt opening check. Joker = 0. Ace = 11. */
export function calculateMeldValue(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + (POINT_VALUE[c.rank] ?? 0), 0);
}

// ── Set validation ────────────────────────────────────────────────────────────
// Rules 5.1: 3-4 cards, same rank, each a different suit, no duplicate IDs
// One Joker allowed as wildcard for the missing suit/rank.
function validateSet(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const real   = cards.filter(c => c.rank !== 'JOKER');
  const jokers = cards.filter(c => c.rank === 'JOKER');
  if (jokers.length > 1) return false;
  const rank = real[0]?.rank;
  if (!rank || real.some(c => c.rank !== rank)) return false;
  const suits = real.map(c => c.suit);
  if (new Set(suits).size !== suits.length) return false;
  const ids = cards.map(c => c.id);
  if (new Set(ids).size !== ids.length) return false;
  return true;
}

// ── Sequence validation ────────────────────────────────────────────────────────
// Rules 5.1, 2.3: 3-5 cards, same suit, consecutive ranks.
// Ace can be HIGH (14: A-K-Q) or LOW (1: A-2-3). No wraparound (K-A-2 illegal).
// One Joker fills exactly one gap.
function rankToNum(rank: Rank, aceHigh: boolean): number {
  if (rank === 'JOKER') return -1;
  if (rank === 'A') return aceHigh ? 14 : 1;
  return RANK_ORDER[rank] ?? -1;
}

function trySequence(real: Card[], jokerCount: number, aceHigh: boolean): boolean {
  const nums = real.map(c => rankToNum(c.rank as Rank, aceHigh)).sort((a, b) => a - b);
  if (new Set(nums).size !== nums.length) return false;
  let needed = 0;
  for (let i = 1; i < nums.length; i++) {
    const gap = nums[i] - nums[i - 1];
    if (gap === 1) continue;
    if (gap === 2) { needed++; } else { return false; }
  }
  return needed <= jokerCount;
}

function validateSequence(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 5) return false;
  const ids = cards.map(c => c.id);
  if (new Set(ids).size !== ids.length) return false;
  const real   = cards.filter(c => c.rank !== 'JOKER');
  const jokers = cards.filter(c => c.rank === 'JOKER');
  if (jokers.length > 1) return false;
  const suit = real[0]?.suit;
  if (!suit || real.some(c => c.suit !== suit)) return false;
  return trySequence(real, jokers.length, false) || trySequence(real, jokers.length, true);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * validateMeld  -  Rules 5.1, 5.2, 7.2
 *
 * The single entry point for all meld validation. Called by:
 *   - LAY_MELD action handler (is this a legal new meld?)
 *   - Opening threshold check (are these melds worth 41+ points?)
 *
 * @param cards            the cards the player wants to meld
 * @param meldType         'set' or 'sequence' - player declares their intent
 * @param sequencesOnlyMode  if true (Rules 7.2), sets are illegal
 * @returns  { valid: true } or { valid: false, reason: string }
 *
 * Java analogy:
 *   public static ValidationResult validateMeld(
 *       List<Card> cards, MeldType type, boolean seqOnly)
 */
export function validateMeld(
  cards: Card[],
  meldType: MeldType,
  sequencesOnlyMode: boolean,
): { valid: true } | { valid: false; reason: string } {

  // Guard: minimum cards needed for any meld
  if (cards.length < 3) {
    return { valid: false, reason: 'A meld needs at least 3 cards' };
  }

  // Guard: maximum is 5 (Rules 5.2 - 6+ must be split into separate melds)
  if (cards.length > 5) {
    return { valid: false, reason: 'Maximum meld size is 5 cards - split into two melds' };
  }

  // Guard: sets capped at 4 (Rules 5.2 - set of 5 is never valid)
  if (meldType === 'set' && cards.length === 5) {
    return { valid: false, reason: 'Sets can only have 3 or 4 cards' };
  }

  // Guard: sequences-only mode blocks sets entirely (Rules 7.2)
  if (sequencesOnlyMode && meldType === 'set') {
    return { valid: false, reason: 'Sequences only mode: sets are not allowed' };
  }

  // Validate based on declared type
  if (meldType === 'set') {
    return validateSet(cards)
      ? { valid: true }
      : { valid: false, reason: 'Invalid set: needs 3-4 cards of same rank, different suits' };
  }

  // meldType === 'sequence'
  return validateSequence(cards)
    ? { valid: true }
    : { valid: false, reason: 'Invalid sequence: needs 3-5 consecutive cards of same suit (Ace high or low, no wraparound)' };
}

/**
 * meetsOpeningThreshold  -  Rules 5.3
 *
 * Checks whether a collection of melds totals at least 41 points.
 * Called when an unopened player picks up from the discard pile.
 * Jokers in the melds contribute 0 points.
 *
 * @param melds  array of card arrays (each inner array is one proposed meld)
 * @returns true if total >= 41
 *
 * Java analogy: public static boolean meetsOpeningThreshold(List<List<Card>> melds)
 */
export function meetsOpeningThreshold(melds: Card[][]): boolean {
  const total = melds.reduce((sum, meld) => sum + calculateMeldValue(meld), 0);
  return total >= 41;
}

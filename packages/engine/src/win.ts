import { GameState, WinType, Card } from './types';

// =============================================================================
// win.ts  -  checkWinCondition + advanceTurn + handleTimeout
//
// Java analogy: a static utility class — WinDetector + TurnManager.
// All functions are pure: given state, return a result. No side effects.
// =============================================================================

/**
 * checkWinCondition  -  Rules 8.1, 6.3, 7.4
 *
 * Called after a player discards their final card (hand is now empty after
 * the discard). Returns the WinType, or null if nobody has won yet.
 *
 * Win types (Rules 8.2):
 *   'normal'       - melded all cards, discarded last one normally
 *   'joker'        - final discarded card was a Joker (2x payout)
 *   'perfect_hand' - 5 identical pairs + meld of 3 + discard in one turn (2x)
 *
 * Java analogy:
 *   public static Optional<WinType> checkWinCondition(
 *       GameState state, String playerId, Card discardedCard)
 */
export function checkWinCondition(
  state: GameState,
  playerId: string,
  discardedCard: Card,
): WinType | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  // Player must have an empty hand after discarding to win
  if (player.hand.length !== 0) return null;

  // Check Perfect Hand first (Rules 7.4):
  // 5 identical pairs (same rank + same suit, from the double deck) + meld of 3
  // This can only happen on the turn the player draws their 14th card — meaning
  // they had 0 melds before this turn (all 13 cards played in one go).
  // We detect it by checking: player laid exactly 5 pair-melds + 1 three-card meld
  // this turn. Since we don't track "this turn's melds" separately, we check
  // whether the player's melds on the table are exactly [5 pairs + 1 triple].
  if (isPerfectHand(state, playerId)) {
    return 'perfect_hand';
  }

  // Joker finish (Rules 6.3): final discard is a Joker
  if (discardedCard.rank === 'JOKER') {
    return 'joker';
  }

  // Normal win
  return 'normal';
}

/**
 * isPerfectHand  -  Rules 7.4
 *
 * A Perfect Hand requires (all in a single turn from 14 cards):
 *   - Exactly 5 melds that are pairs of identical cards (same rank + same suit,
 *     only possible with the double deck — e.g. 7S_0 + 7S_1)
 *   - Exactly 1 meld of 3 cards (set or valid sequence)
 *   - 1 final discard
 *   - Total: 10 + 3 + 1 = 14 cards — the entire hand played in one turn
 *
 * We detect this by inspecting the player's melds on the table.
 * The player must own exactly 6 melds: 5 two-card pair melds + 1 three-card meld.
 */
function isPerfectHand(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  const myMelds = state.allMelds.filter(m => m.ownerId === playerId);

  // Must have exactly 6 melds
  if (myMelds.length !== 6) return false;

  const pairMelds   = myMelds.filter(m => m.cards.length === 2);
  const tripleMelds = myMelds.filter(m => m.cards.length === 3);

  // Must be exactly 5 pairs + 1 triple
  if (pairMelds.length !== 5 || tripleMelds.length !== 1) return false;

  // Each pair must be two identical cards (same rank + same suit, diff deckIndex)
  for (const meld of pairMelds) {
    const [a, b] = meld.cards;
    if (a.rank !== b.rank) return false;
    if (a.suit !== b.suit) return false;
    if (a.deckIndex === b.deckIndex) return false; // must be from different decks
    if (a.id === b.id) return false;               // must be different physical cards
  }

  return true;
}

/**
 * advanceTurn  -  Rules 3.4, 9.4
 *
 * Moves to the next player clockwise, resets the turn timer.
 * Skips disconnected players.
 *
 * Java analogy: public static GameState advanceTurn(GameState state)
 */
export function advanceTurn(state: GameState): GameState {
  const count = state.players.length;
  let next = (state.activePlayerIndex + 1) % count;

  // Skip disconnected players (up to a full loop)
  let loops = 0;
  while (state.players[next].status === 'disconnected' && loops < count) {
    next = (next + 1) % count;
    loops++;
  }

  return {
    ...state,
    activePlayerIndex: next,
    turnStartedAt: Date.now(),
  };
}

/**
 * handleTimeout  -  Rules 9.4
 *
 * Called by the server when a player's 30-second turn timer expires.
 * Auto-draws from deck and auto-discards the drawn card.
 * Returns new GameState with turn advanced.
 *
 * Java analogy: public static GameState handleTimeout(GameState state)
 */
export function handleTimeout(state: GameState): GameState {
  const player = state.players[state.activePlayerIndex];
  if (!player) return state;

  // Auto-draw: take top card from draw pile (reshuffle if empty)
  let s = state;
  if (s.drawPile.length === 0) {
    // Reshuffle discard pile into new draw pile (Rules 7.1)
    const top = s.discardPile[s.discardPile.length - 1];
    const reshuffled = [...s.discardPile.slice(0, -1)].sort(() => Math.random() - 0.5);
    s = { ...s, drawPile: reshuffled, discardPile: [top] };
  }

  const drawnCard = s.drawPile[0];
  const newHand = [...player.hand, drawnCard];
  const newDrawPile = s.drawPile.slice(1);

  // Auto-discard: discard the drawn card immediately
  const autoDiscard = drawnCard;
  const finalHand = newHand.filter(c => c.id !== autoDiscard.id);

  const updatedPlayers = s.players.map(p =>
    p.id === player.id ? { ...p, hand: finalHand } : p
  );

  return advanceTurn({
    ...s,
    drawPile: newDrawPile,
    discardPile: [...s.discardPile, autoDiscard],
    players: updatedPlayers,
  });
}

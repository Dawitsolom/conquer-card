import { Card, Suit, Rank, Player, GameState, TableConfig } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// deck.ts  —  createDeck · shuffleDeck · dealCards
//
// Java analogy: think of this file as a static utility class, like
//   public final class DeckUtils { public static List<Card> createDeck(...) {} }
// Every function is pure — no side effects, no mutation of inputs.
// ─────────────────────────────────────────────────────────────────────────────

// The 13 ranks in rank order (low → high for sequence validation later)
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

// The 4 standard suits (no 'joker' here — Jokers are added separately)
const SUITS: Suit[] = ['spades','hearts','diamonds','clubs'];

// Converts rank+suit to the short code used in card IDs
// e.g. rank='7', suit='spades' → '7S'
function rankSuitCode(rank: Rank, suit: Suit): string {
  const r = rank === '10' ? '10' : rank[0]; // '10' stays '10', others use first char
  const s = suit[0].toUpperCase();           // 'spades'→'S', 'hearts'→'H', etc.
  return r + s;
}

/**
 * createDeck  —  Rules §2.1
 * Builds a full double deck (2 × 52 = 104 cards) plus configurable Jokers,
 * then shuffles it. Returns a flat Card[] ready to deal from.
 *
 * Card IDs are globally unique across both decks:
 *   '7S_0' = 7♠ from deck 0,  '7S_1' = 7♠ from deck 1
 *   'JOKER_0', 'JOKER_1', 'JOKER_2', 'JOKER_3'
 *
 * Java analogy:
 *   public static List<Card> createDeck(int jokerCount) { ... }
 */
export function createDeck(jokerCount: 0 | 2 | 4): Card[] {
  const cards: Card[] = [];

  // Build two identical 52-card decks, distinguishing them by deckIndex
  for (const deckIndex of [0, 1] as const) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const code = rankSuitCode(rank, suit);
        cards.push({
          id: `${code}_${deckIndex}`,
          rank,
          suit,
          deckIndex,
        });
      }
    }
  }

  // Add Jokers — each gets a unique sequential index across both decks
  // jokerCount 0 → none, 2 → one per deck, 4 → two per deck
  for (let i = 0; i < jokerCount; i++) {
    cards.push({
      id: `JOKER_${i}`,
      rank: 'JOKER',
      suit: 'joker',
      deckIndex: (i < 2 ? 0 : 1) as 0 | 1,
    });
  }

  return shuffleDeck(cards);
}

/**
 * shuffleDeck  —  Fisher-Yates algorithm
 * Returns a NEW shuffled array — never mutates the input.
 *
 * Java analogy:
 *   public static List<Card> shuffleDeck(List<Card> deck) {
 *     List<Card> copy = new ArrayList<>(deck);
 *     Collections.shuffle(copy);
 *     return copy;
 *   }
 * We implement Fisher-Yates manually because Math.random() is good enough
 * here and avoids any dependency on a random library.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck]; // spread = shallow copy, same as new ArrayList<>(deck)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // destructured swap — no temp variable needed
  }
  return arr;
}

/**
 * dealCards  —  Rules §3.1 and §3.2
 *
 * Sequence (exactly as the rules describe):
 *   1. Pull the FIRST card off the shuffled deck → this is the faceUpCard
 *      (placed face-up and visible to all, positioned under the draw deck)
 *   2. Deal 13 cards to each non-dealer player (clockwise from dealer+1)
 *   3. Deal 14 cards to the dealer (one extra)
 *   4. The dealer discards one card to start the discard pile
 *   5. Remaining cards form the drawPile
 *
 * Returns a fully initialised GameState with phase='active'.
 *
 * @param tableId     — room identifier
 * @param playerIds   — array of player IDs in seat order
 * @param dealerIndex — index into playerIds of the dealer
 * @param config      — table settings (jokerCount, betAmount, etc.)
 * @param coinBalances — current coin balance per player (looked up by id)
 *
 * Java analogy:
 *   public static GameState dealCards(String tableId, List<String> playerIds,
 *       int dealerIndex, TableConfig config, Map<String,Integer> coinBalances)
 */
export function dealCards(
  tableId: string,
  playerIds: string[],
  displayNames: string[],
  dealerIndex: number,
  config: TableConfig,
  coinBalances: Record<string, number>,
  roundNumber: number = 1,
): GameState {
  const playerCount = playerIds.length;

  // Build and shuffle the full deck
  let deck = createDeck(config.jokerCount);

  // ── Step 1: Pull the face-up card (Rules §3.1) ───────────────────────────
  // First card off the top becomes the faceUpCard, visible to everyone,
  // sitting beneath the draw pile. Nobody can casually draw it — special rules only.
  const faceUpCard = deck[0];
  deck = deck.slice(1); // remove it from the deck

  // ── Steps 2 & 3: Deal hands ──────────────────────────────────────────────
  // Deal clockwise starting from the player LEFT of the dealer.
  // Dealer gets 14 cards; everyone else gets 13.
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  for (let i = 0; i < playerCount; i++) {
    // Seat index clockwise from dealer's left
    const seatIndex = (dealerIndex + 1 + i) % playerCount;
    const cardCount = seatIndex === dealerIndex ? 14 : 13;
    hands[seatIndex] = deck.slice(0, cardCount);
    deck = deck.slice(cardCount);
  }

  // ── Step 4: Dealer discards one card to start the discard pile (Rules §3.2)
  // The dealer has 14 cards and must discard one immediately.
  // We pick the last card in their hand for determinism (engine choice).
  const dealerHand = hands[dealerIndex];
  const firstDiscard = dealerHand[dealerHand.length - 1];
  hands[dealerIndex] = dealerHand.slice(0, 13); // dealer now holds 13 like everyone else

  // ── Step 5: Remaining cards → drawPile ───────────────────────────────────
  const drawPile = deck; // everything not dealt or discarded

  // ── Build Player objects ──────────────────────────────────────────────────
  const players: Player[] = playerIds.map((id, idx) => ({
    id,
    displayName: displayNames[idx] ?? id,
    hand: hands[idx],
    melds: [],
    status: 'unopened' as const,   // everyone starts unopened — Rules §4 Step 1
    faceUpEligible: true,          // eligible until first meld — Rules §7.3
    coinBalance: coinBalances[id] ?? 0,
    isBot: false,
    cameraOn: false,
  }));

  // ── Assemble and return initial GameState ─────────────────────────────────
  return {
    tableId,
    roundNumber,
    phase: 'active',
    turnPhase: 'draw',             // first player must draw before anything else
    players,
    activePlayerIndex: (dealerIndex + 1) % playerCount, // first turn = dealer's left
    drawPile,
    discardPile: [firstDiscard],   // dealer's discard starts the pile
    faceUpCard,
    allMelds: [],
    betAmount: config.betAmount,
    dealerIndex,
    jokerCount: config.jokerCount,
    sequencesOnlyMode: config.sequencesOnlyMode,
    turnStartedAt: Date.now(),
    turnTimeoutSeconds: config.turnTimeoutSeconds,
    stateVersion: 1,
  };
}

/**
 * reshuffleDeck  —  Rules §7.1
 * Called when the drawPile runs out mid-round.
 * Takes all discard pile cards EXCEPT the top one, shuffles them,
 * and turns them into the new draw pile. The top discard card stays
 * as the new discard pile starter.
 *
 * Returns a new GameState (never mutates the input).
 *
 * Java analogy:
 *   public static GameState reshuffleDeck(GameState state) { ... }
 */
export function reshuffleDeck(state: GameState): GameState {
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const cardsToReshuffle = state.discardPile.slice(0, -1); // all but the top card
  const newDrawPile = shuffleDeck(cardsToReshuffle);

  return {
    ...state,
    drawPile: newDrawPile,
    discardPile: [topDiscard],
  };
}

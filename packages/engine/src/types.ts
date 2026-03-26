// =============================================================================
// CONQUER CARD — types.ts
// Canonical TypeScript types for the Conquer Card game engine.
// Every type here maps directly to the Rules doc (v1.1) and Tech Spec (§3.1).
// =============================================================================

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';

export type Rank =
  | 'A'
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K'
  | 'JOKER';

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
  deckIndex: 0 | 1;
};

/**
 * MeldType:
 *   'set'      — 3-4 cards, same rank, each a DIFFERENT suit (Rules 5.1)
 *   'sequence' — 3-5 consecutive cards of the same suit (Rules 5.1)
 *   'pair'     — exactly 2 identical cards: same rank + same suit, one from
 *                each deck (deckIndex 0 and 1). Only possible in the double
 *                deck. Used exclusively in the Perfect Hand (Rules 7.4).
 */
export type MeldType = 'set' | 'sequence' | 'pair';

export type Meld = {
  id: string;
  ownerId: string;
  type: MeldType;
  cards: Card[];
};

export type PlayerStatus =
  | 'unopened'
  | 'opened'
  | 'finishing'
  | 'disconnected'
  | 'spectating';

export type Player = {
  id: string;
  displayName: string;
  hand: Card[];
  melds: Meld[];
  status: PlayerStatus;
  faceUpEligible: boolean;
  coinBalance: number;
  isBot: boolean;
  cameraOn: boolean;
};

export type RoundPhase = 'waiting' | 'dealing' | 'active' | 'round_over';

/**
 * TurnPhase tracks where in a single player's turn we are.
 *
 *   'draw' — turn just started; player MUST draw (DRAW_FROM_DECK /
 *            PICK_UP_DISCARD / TAKE_FACE_UP_CARD) before anything else.
 *   'play' — player has drawn; may lay melds, add to melds, steal a Joker,
 *            or discard. Drawing again is blocked.
 *
 * This makes turn-flow enforceable by the engine with no server-side hacks.
 * Java analogy: a state-machine enum — like Order.Status (PLACED → SHIPPED → DELIVERED).
 */
export type TurnPhase = 'draw' | 'play';

export type GameState = {
  tableId: string;
  roundNumber: number;
  phase: RoundPhase;
  /** Which sub-phase of the active player's turn we are in. See TurnPhase. */
  turnPhase: TurnPhase;
  players: Player[];
  activePlayerIndex: number;
  drawPile: Card[];
  discardPile: Card[];
  faceUpCard: Card | null;
  allMelds: Meld[];
  betAmount: number;
  dealerIndex: number;
  jokerCount: 0 | 2 | 4;
  sequencesOnlyMode: boolean;
  turnStartedAt: number;
  turnTimeoutSeconds: number;
  /** Monotonically increasing write counter — used for optimistic compare-and-set in Redis. */
  stateVersion?: number;
};

export type WinType = 'normal' | 'joker' | 'perfect_hand';

export type PayoutResult = {
  [playerId: string]: number;
};

export type DrawFromDeckAction = { type: 'DRAW_FROM_DECK'; playerId: string };
export type PickUpDiscardAction = { type: 'PICK_UP_DISCARD'; playerId: string };
export type TakeFaceUpCardAction = { type: 'TAKE_FACE_UP_CARD'; playerId: string };
/** One meld within a LAY_MELD action. */
export type MeldSpec = { cards: Card[]; meldType: MeldType };

/**
 * LAY_MELD — lay one or more melds in a single action.
 *
 * Opened players typically send one meld (melds.length === 1).
 * Unopened players MUST send ALL opening melds at once so the engine can
 * validate the 41-pt / 3-meld opening threshold in a single step (Rules 5.3).
 */
export type LayMeldAction = { type: 'LAY_MELD'; playerId: string; melds: MeldSpec[] };
export type AddToMeldAction = { type: 'ADD_TO_MELD'; playerId: string; meldId: string; cards: Card[]; position: 'start' | 'end' };
export type StealJokerAction = { type: 'STEAL_JOKER'; playerId: string; meldId: string; replacementCard: Card };
export type DiscardAction = { type: 'DISCARD'; playerId: string; card: Card };
export type LeaveTableAction = { type: 'LEAVE_TABLE'; playerId: string };
export type ToggleCameraAction = { type: 'TOGGLE_CAMERA'; playerId: string; cameraOn: boolean };

export type GameAction =
  | DrawFromDeckAction
  | PickUpDiscardAction
  | TakeFaceUpCardAction
  | LayMeldAction
  | AddToMeldAction
  | StealJokerAction
  | DiscardAction
  | LeaveTableAction
  | ToggleCameraAction;

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export type RoundResult = {
  winnerId: string;
  winType: WinType;
  payouts: PayoutResult;
};

export type TableConfig = {
  jokerCount: 0 | 2 | 4;
  sequencesOnlyMode: boolean;
  betAmount: number;
  turnTimeoutSeconds: number;
};

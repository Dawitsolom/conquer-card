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

export type MeldType = 'set' | 'sequence';

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

export type GameState = {
  tableId: string;
  roundNumber: number;
  phase: RoundPhase;
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
};

export type WinType = 'normal' | 'joker' | 'perfect_hand';

export type PayoutResult = {
  [playerId: string]: number;
};

export type DrawFromDeckAction = { type: 'DRAW_FROM_DECK'; playerId: string };
export type PickUpDiscardAction = { type: 'PICK_UP_DISCARD'; playerId: string };
export type TakeFaceUpCardAction = { type: 'TAKE_FACE_UP_CARD'; playerId: string };
export type LayMeldAction = { type: 'LAY_MELD'; playerId: string; cards: Card[]; meldType: MeldType };
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

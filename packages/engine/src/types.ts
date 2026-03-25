export type Suit = "coins" | "cups" | "swords" | "clubs";
export type Rank = 1|2|3|4|5|6|7|8|9|10|11|12;
export interface Card { suit: Suit; rank: Rank; id: string; }
export interface Player { id: string; name: string; hand: Card[]; score: number; isConnected: boolean; }
export type GamePhase = "waiting"|"dealing"|"playing"|"scoring"|"finished";
export interface GameState { roomId: string; players: Player[]; deck: Card[]; currentPlayerIndex: number; phase: GamePhase; round: number; maxRounds: number; }
export interface GameAction { type: "PLAY_CARD"|"DRAW_CARD"|"PASS"; playerId: string; cardId?: string; }
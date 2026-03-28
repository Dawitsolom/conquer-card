// =============================================================================
// clientState.ts  —  The GameState shape that clients (mobile) actually receive.
// Copied from packages/contracts/src/clientState.ts — lives inside mobile so
// Metro never needs to watch a sibling workspace package.
// =============================================================================

import type { Card, GameState, Meld, PlayerStatus } from "../../engine/dist";

// A player as seen by themselves: full hand visible.
export type OwnClientPlayer = {
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

// An opponent as seen by any other player: hand is hidden, only count.
export type OpponentClientPlayer = Omit<OwnClientPlayer, "hand"> & {
  handCount: number;
};

export type ClientPlayer = OwnClientPlayer | OpponentClientPlayer;

/** Narrow helper — returns true if this ClientPlayer is the receiver's own record. */
export function isOwnPlayer(p: ClientPlayer): p is OwnClientPlayer {
  return "hand" in p;
}

/**
 * The sanitized GameState shape sent over the wire to each client.
 * Replaces the raw GameState from the engine with:
 *   - drawPile → drawPileCount (number)
 *   - players  → ClientPlayer[] (opponents have handCount, not hand)
 */
export type ClientGameState = Omit<GameState, "drawPile" | "players"> & {
  drawPileCount: number;
  players: ClientPlayer[];
};

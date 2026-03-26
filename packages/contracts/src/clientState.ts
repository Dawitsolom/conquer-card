// =============================================================================
// clientState.ts  —  The GameState shape that clients (mobile) actually receive.
//
// The server NEVER sends the raw engine GameState to any client:
//   - drawPile contents are hidden (only count is sent)
//   - opponent hands are stripped (only handCount is sent)
//
// This type is the canonical "what the wire looks like" definition.
// Both sanitizeForPlayer() on the server and the mobile store use it.
//
// Java analogy: a DTO (Data Transfer Object) — like a @JsonView projection
// that removes fields not intended for the client role.
// =============================================================================

import type { Card, GameState, Meld, PlayerStatus, RoundPhase } from "@conquer-card/engine";

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
  // Convenience alias so UI doesn't need to know about engine internals.
  // roundNumber already exists on GameState — re-exported here for clarity.
};

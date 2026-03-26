// =============================================================================
// events.ts  —  Single source of truth for all Socket.io event names + payloads.
//
// WHY THIS FILE EXISTS:
//   Previously the server had string literals ("table:join", "game:state_update")
//   and the mobile client had completely different strings ("join_room",
//   "game_state"). There was no compile-time enforcement — any typo was a
//   silent runtime failure.
//
//   This file gives every event a named constant. Both the server and mobile
//   import from here, so a rename is one change, not a grep-and-pray.
//
// Java analogy: an interface (or enum) that both the server-side WebSocket
// handler and the Android client implement — any drift is caught at compile time.
//
// NAMING CONVENTION:
//   CLIENT_EVENTS — emitted by the mobile client, handled by the server
//   SERVER_EVENTS — emitted by the server, handled by the mobile client
// =============================================================================

import type { GameAction, WinType, PayoutResult } from "@conquer-card/engine";
import type { ClientGameState } from "./clientState";

// ── Event name constants ──────────────────────────────────────────────────────

/** Events the CLIENT sends to the SERVER. */
export const CLIENT_EVENTS = {
  JOIN_TABLE:      "table:join",
  READY:           "player:ready",
  GAME_ACTION:     "game:action",
  LEAVE_TABLE:     "table:leave",
  EMOJI:           "player:emoji",
  CAMERA_TOGGLE:   "player:camera_toggle",
} as const;

/** Events the SERVER sends to the CLIENT. */
export const SERVER_EVENTS = {
  STATE_UPDATE:         "game:state_update",
  ROUND_START:          "game:round_start",
  ROUND_OVER:           "game:round_over",
  TURN_CHANGED:         "game:turn_changed",
  TURN_TIMEOUT:         "game:turn_timeout",
  PLAYER_JOINED:        "game:player_joined",
  PLAYER_LEFT:          "game:player_left",
  PLAYER_DISCONNECTED:  "game:player_disconnected",
  PLAYER_RECONNECTED:   "game:player_reconnected",
  ACTION_REJECTED:      "game:action_rejected",
  ERROR:                "game:error",
  EMOJI_REACTION:       "player:emoji_reaction",
} as const;

// ── Payload types ─────────────────────────────────────────────────────────────
// One type per event so both sides agree on the shape.

// Client → Server payloads

export type JoinTablePayload       = { tableId: string };
export type ReadyPayload           = { tableId: string };
export type GameActionPayload      = GameAction & { tableId: string };
export type LeaveTablePayload      = { tableId: string };
export type EmojiPayload           = { tableId: string; emoji: string };
export type CameraTogglePayload    = { tableId: string; cameraOn: boolean };

// Server → Client payloads

export type StateUpdatePayload     = ClientGameState;
export type RoundStartPayload      = { roundNumber: number; dealerIndex: number };
export type RoundOverPayload       = { winnerId: string; winType: WinType; payouts: PayoutResult };
export type TurnChangedPayload     = { activePlayerId: string; timeoutAt: number };
export type TurnTimeoutPayload     = { playerId: string };
export type PlayerJoinedPayload    = { playerId: string; displayName: string };
export type PlayerLeftPayload      = { playerId: string; forfeited?: boolean };
export type PlayerDisconnectedPayload = { playerId: string; reconnectDeadline: number };
export type PlayerReconnectedPayload  = { playerId: string };
export type ActionRejectedPayload  = { reason: string };
export type ErrorPayload           = { message: string };
export type EmojiReactionPayload   = { playerId: string; emoji: string };

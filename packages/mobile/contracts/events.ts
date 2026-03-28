// =============================================================================
// events.ts  —  Single source of truth for all Socket.io event names + payloads.
// Copied from packages/contracts/src/events.ts — lives inside mobile so
// Metro never needs to watch a sibling workspace package.
// =============================================================================

import type { GameAction, WinType, PayoutResult } from "../../engine/dist";
import type { ClientGameState } from "./clientState";

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

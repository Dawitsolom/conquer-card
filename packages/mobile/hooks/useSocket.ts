// =============================================================================
// useSocket.ts — Socket.io connection lifecycle + emit helpers
//
// Responsibilities (only these — nothing else):
//   1. Create and maintain the socket connection authenticated with the app JWT
//   2. Reconnect automatically when JWT changes or socket drops
//   3. Expose emit helpers for all client → server events
//   4. Expose the raw socket ref so useGameEvents can attach listeners
//
// Game event handling is intentionally NOT here — see useGameEvents.ts.
//
// Java analogy: like a WebSocket session manager bean — it owns the
// transport layer but delegates message handling to listener classes.
// =============================================================================

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import { CLIENT_EVENTS } from "@conquer-card/contracts";
import type { GameAction } from "@conquer-card/engine";
import type { ClientGameState } from "@conquer-card/contracts";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function useSocket() {
  const socketRef  = useRef<Socket | null>(null);
  const { setConnected, setGameState, tableId } = useGameStore();
  const jwt = useAuthStore(s => s.jwt);

  useEffect(() => {
    if (!jwt) return;   // not authenticated — do not connect

    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { token: jwt },   // ← server auth middleware verifies this JWT
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // On reconnect: re-join the active table and fetch current game state.
      // This handles both initial connect and transparent reconnects after drops.
      const currentTableId = useGameStore.getState().tableId;
      if (currentTableId) {
        socket.emit(CLIENT_EVENTS.JOIN_TABLE, { tableId: currentTableId });
        // Fetch full state via REST in case socket missed events during disconnect.
        void fetch(`${API_URL}/tables/${currentTableId}/state`, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
          .then(r => r.ok ? r.json() : null)
          .then((state: ClientGameState | null) => {
            if (state) setGameState(state);
          })
          .catch(() => {});   // non-fatal — server will push STATE_UPDATE on join
      }
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [jwt]);  // reconnect when JWT changes (login / token refresh)

  // ── Emit helpers ─────────────────────────────────────────────────────────────
  // All helpers check socketRef.current so they are safe to call even if the
  // socket is not yet connected — the emit is silently dropped.

  const joinTable = (tableId: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.JOIN_TABLE, { tableId });
  };

  const leaveTable = (tableId: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.LEAVE_TABLE, { tableId });
  };

  const signalReady = (tableId: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.READY, { tableId });
  };

  /** Send any GameAction to the server.  playerId is set by the server from JWT. */
  const sendAction = (tableId: string, action: GameAction) => {
    socketRef.current?.emit(CLIENT_EVENTS.GAME_ACTION, { ...action, tableId });
  };

  const sendEmoji = (tableId: string, emoji: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.EMOJI, { tableId, emoji });
  };

  const toggleCamera = (tableId: string, cameraOn: boolean) => {
    socketRef.current?.emit(CLIENT_EVENTS.CAMERA_TOGGLE, { tableId, cameraOn });
  };

  return {
    socket: socketRef.current,   // raw socket for useGameEvents
    joinTable,
    leaveTable,
    signalReady,
    sendAction,
    sendEmoji,
    toggleCamera,
  };
}

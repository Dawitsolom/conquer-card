import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getAuth } from "firebase/auth";
import { useGameStore } from "../store/gameStore";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
} from "@conquer-card/contracts";
import type {
  ClientGameState,
  RoundStartPayload,
  RoundOverPayload,
  TurnChangedPayload,
  TurnTimeoutPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerDisconnectedPayload,
  ActionRejectedPayload,
  ErrorPayload,
  EmojiReactionPayload,
} from "@conquer-card/contracts";
import type { GameAction } from "@conquer-card/engine";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setGameState,
    setConnected,
    setRoundResult,
    setTurnInfo,
    setError,
  } = useGameStore();

  useEffect(() => {
    // Auth: get the current Firebase ID token and pass it in handshake.auth.
    // The server's io.use() middleware requires this — connections without a
    // token are rejected immediately.
    //
    // The socket is created inside the async call, so we store it in a ref
    // and the synchronous cleanup function disconnects whatever was stored.
    // This guarantees the socket is always disconnected on unmount even though
    // the connection itself is asynchronous.
    const connectWithToken = async () => {
      const user = getAuth().currentUser;
      const token = user ? await user.getIdToken() : "";

      const socket = io(API_URL, {
        transports: ["websocket"],
        auth: { token },        // ← required by server auth middleware
      });
      socketRef.current = socket;

      socket.on("connect",    () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      // Primary state update — personalised per-player payload from sanitizeForPlayer
      socket.on(SERVER_EVENTS.STATE_UPDATE, (state: ClientGameState) => {
        setGameState(state);
      });

      // Round lifecycle
      socket.on(SERVER_EVENTS.ROUND_START, (_payload: RoundStartPayload) => {
        // UI can react to round start independently (e.g. deal animation).
        // State arrives via STATE_UPDATE immediately after.
      });

      socket.on(SERVER_EVENTS.ROUND_OVER, (payload: RoundOverPayload) => {
        setRoundResult(payload);
      });

      // Turn timer info — lets the UI show a countdown bar
      socket.on(SERVER_EVENTS.TURN_CHANGED, (payload: TurnChangedPayload) => {
        setTurnInfo(payload);
      });

      socket.on(SERVER_EVENTS.TURN_TIMEOUT, (_payload: TurnTimeoutPayload) => {
        // State arrives via STATE_UPDATE; UI can show a brief "timed out" toast.
      });

      // Player presence events — UI updates (seat indicators, etc.)
      socket.on(SERVER_EVENTS.PLAYER_JOINED,       (_p: PlayerJoinedPayload)       => {});
      socket.on(SERVER_EVENTS.PLAYER_LEFT,         (_p: PlayerLeftPayload)         => {});
      socket.on(SERVER_EVENTS.PLAYER_DISCONNECTED, (_p: PlayerDisconnectedPayload) => {});
      socket.on(SERVER_EVENTS.PLAYER_RECONNECTED,  (_p: { playerId: string })      => {});

      // Emoji reactions
      socket.on(SERVER_EVENTS.EMOJI_REACTION, (_p: EmojiReactionPayload) => {});

      // Errors
      socket.on(SERVER_EVENTS.ACTION_REJECTED, (p: ActionRejectedPayload) => {
        setError(p.reason);
      });
      socket.on(SERVER_EVENTS.ERROR, (p: ErrorPayload) => {
        setError(p.message);
      });
    };

    void connectWithToken();

    // Cleanup: disconnect whatever socket was stored (works whether connect
    // completed synchronously or is still in flight).
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Emit helpers ────────────────────────────────────────────────────────────

  const joinTable = (tableId: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.JOIN_TABLE, { tableId });
  };

  const signalReady = (tableId: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.READY, { tableId });
  };

  /** Send any validated GameAction. playerId is overridden by the server. */
  const sendAction = (tableId: string, action: GameAction) => {
    socketRef.current?.emit(CLIENT_EVENTS.GAME_ACTION, { ...action, tableId });
  };

  const leaveTable = (tableId: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.LEAVE_TABLE, { tableId });
  };

  const sendEmoji = (tableId: string, emoji: string) => {
    socketRef.current?.emit(CLIENT_EVENTS.EMOJI, { tableId, emoji });
  };

  const toggleCamera = (tableId: string, cameraOn: boolean) => {
    socketRef.current?.emit(CLIENT_EVENTS.CAMERA_TOGGLE, { tableId, cameraOn });
  };

  return {
    joinTable,
    signalReady,
    sendAction,
    leaveTable,
    sendEmoji,
    toggleCamera,
    socket: socketRef.current,
  };
}

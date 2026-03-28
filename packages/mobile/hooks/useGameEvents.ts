// =============================================================================
// useGameEvents.ts — Register all server → client game event listeners
//
// This hook attaches listeners to the active socket and keeps the game store
// up to date.  It is intentionally separate from useSocket so that:
//   1. useSocket owns connection lifecycle only
//   2. useGameEvents owns what happens with each server event
//
// Java analogy: like an @EventListener class in Spring — a single place
// that handles all inbound application events and updates state.
//
// Call this hook once, inside the game screen component.
// It is safe to call multiple times — the returned cleanup removes all
// listeners it registered, preventing duplicates on remount.
// =============================================================================

import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { SERVER_EVENTS } from "@conquer-card/contracts";
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
import type { Socket } from "socket.io-client";

export function useGameEvents(socket: Socket | null) {
  const {
    setGameState,
    setRoundResult,
    setTurnInfo,
    setRejectionReason,
    setError,
    setCountdown,
  } = useGameStore();

  // Track whether we've already registered for this socket instance so we
  // don't double-register on re-renders.
  const registeredSocket = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket || socket === registeredSocket.current) return;
    registeredSocket.current = socket;

    // ── Primary state update ──────────────────────────────────────────────────
    const onStateUpdate = (state: ClientGameState) => {
      setGameState(state);
    };

    // ── Round lifecycle ───────────────────────────────────────────────────────
    const onRoundStart = (_payload: RoundStartPayload) => {
      // State arrives via STATE_UPDATE right after.
      // UI can use this event to trigger a card-deal animation.
    };

    const onRoundOver = (payload: RoundOverPayload) => {
      setRoundResult(payload);
    };

    // ── Turn management ───────────────────────────────────────────────────────
    const onTurnChanged = (payload: TurnChangedPayload) => {
      setTurnInfo(payload);
    };

    const onTurnTimeout = (_payload: TurnTimeoutPayload) => {
      // Server auto-acts for the timed-out player and sends a STATE_UPDATE.
      // UI can show a brief "timed out" toast here if desired.
    };

    // ── Pre-round countdown ───────────────────────────────────────────────────
    const onCountdown = (payload: { secondsRemaining: number }) => {
      setCountdown(payload.secondsRemaining);
    };

    // ── Player presence ───────────────────────────────────────────────────────
    // These arrive alongside STATE_UPDATE so we don't need to derive state
    // here — they're kept for future toast / seat-flash animations.
    const onPlayerJoined       = (_p: PlayerJoinedPayload)       => {};
    const onPlayerLeft         = (_p: PlayerLeftPayload)         => {};
    const onPlayerDisconnected = (_p: PlayerDisconnectedPayload) => {};
    const onPlayerReconnected  = (_p: { playerId: string })      => {};

    // ── Social ────────────────────────────────────────────────────────────────
    const onEmojiReaction = (_p: EmojiReactionPayload) => {
      // TODO Step 7: forward to uiStore for floating emoji animation
    };

    // ── Errors / rejections ───────────────────────────────────────────────────
    const onActionRejected = (p: ActionRejectedPayload) => {
      setRejectionReason(p.reason);   // auto-clears after 3 s (see gameStore)
    };

    const onError = (p: ErrorPayload) => {
      setError(p.message);
    };

    // ── Register ──────────────────────────────────────────────────────────────
    socket.on(SERVER_EVENTS.STATE_UPDATE,        onStateUpdate);
    socket.on(SERVER_EVENTS.ROUND_START,         onRoundStart);
    socket.on(SERVER_EVENTS.ROUND_OVER,          onRoundOver);
    socket.on(SERVER_EVENTS.TURN_CHANGED,        onTurnChanged);
    socket.on(SERVER_EVENTS.TURN_TIMEOUT,        onTurnTimeout);
    socket.on("table:countdown",                 onCountdown);
    socket.on(SERVER_EVENTS.PLAYER_JOINED,       onPlayerJoined);
    socket.on(SERVER_EVENTS.PLAYER_LEFT,         onPlayerLeft);
    socket.on(SERVER_EVENTS.PLAYER_DISCONNECTED, onPlayerDisconnected);
    socket.on(SERVER_EVENTS.PLAYER_RECONNECTED,  onPlayerReconnected);
    socket.on(SERVER_EVENTS.EMOJI_REACTION,      onEmojiReaction);
    socket.on(SERVER_EVENTS.ACTION_REJECTED,     onActionRejected);
    socket.on(SERVER_EVENTS.ERROR,               onError);

    return () => {
      socket.off(SERVER_EVENTS.STATE_UPDATE,        onStateUpdate);
      socket.off(SERVER_EVENTS.ROUND_START,         onRoundStart);
      socket.off(SERVER_EVENTS.ROUND_OVER,          onRoundOver);
      socket.off(SERVER_EVENTS.TURN_CHANGED,        onTurnChanged);
      socket.off(SERVER_EVENTS.TURN_TIMEOUT,        onTurnTimeout);
      socket.off("table:countdown",                 onCountdown);
      socket.off(SERVER_EVENTS.PLAYER_JOINED,       onPlayerJoined);
      socket.off(SERVER_EVENTS.PLAYER_LEFT,         onPlayerLeft);
      socket.off(SERVER_EVENTS.PLAYER_DISCONNECTED, onPlayerDisconnected);
      socket.off(SERVER_EVENTS.PLAYER_RECONNECTED,  onPlayerReconnected);
      socket.off(SERVER_EVENTS.EMOJI_REACTION,      onEmojiReaction);
      socket.off(SERVER_EVENTS.ACTION_REJECTED,     onActionRejected);
      socket.off(SERVER_EVENTS.ERROR,               onError);
      registeredSocket.current = null;
    };
  }, [socket]);
}

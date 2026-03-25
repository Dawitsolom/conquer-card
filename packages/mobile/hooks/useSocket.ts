import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "../store/gameStore";
import type { GameState } from "@conquer-card/engine";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { setGameState, setConnected, playerId, playerName, roomId } = useGameStore();

  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room_state", (state: GameState) => setGameState(state));
    socket.on("game_started", (state: GameState) => setGameState(state));
    socket.on("game_state", (state: GameState) => setGameState(state));

    return () => { socket.disconnect(); };
  }, []);

  const joinRoom = (targetRoomId: string) => {
    socketRef.current?.emit("join_room", { roomId: targetRoomId, userId: playerId, name: playerName });
  };

  const startGame = (targetRoomId: string) => {
    socketRef.current?.emit("start_game", { roomId: targetRoomId });
  };

  const playCard = (targetRoomId: string, cardId: string) => {
    socketRef.current?.emit("play_card", { roomId: targetRoomId, action: { type: "PLAY_CARD", playerId, cardId } });
  };

  return { joinRoom, startGame, playCard, socket: socketRef.current };
}
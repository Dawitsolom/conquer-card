import { create } from "zustand";
import type { GameState } from "@conquer-card/engine";

interface GameStore {
  playerName: string;
  playerId: string;
  roomId: string | null;
  gameState: GameState | null;
  isConnected: boolean;
  setPlayerName: (name: string) => void;
  setPlayerId: (id: string) => void;
  setRoomId: (id: string | null) => void;
  setGameState: (state: GameState) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerName: "",
  playerId: "",
  roomId: null,
  gameState: null,
  isConnected: false,
  setPlayerName: (name) => set({ playerName: name }),
  setPlayerId: (id) => set({ playerId: id }),
  setRoomId: (id) => set({ roomId: id }),
  setGameState: (state) => set({ gameState: state }),
  setConnected: (connected) => set({ isConnected: connected }),
  reset: () => set({ roomId: null, gameState: null, isConnected: false }),
}));
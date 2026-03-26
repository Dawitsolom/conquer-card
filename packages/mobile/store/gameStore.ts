import { create } from "zustand";
import type { ClientGameState, RoundOverPayload, TurnChangedPayload } from "@conquer-card/contracts";

interface GameStore {
  // Auth / identity
  playerId:   string;
  playerName: string;

  // Navigation
  tableId: string | null;

  // Real-time state
  gameState:   ClientGameState | null;
  roundResult: RoundOverPayload | null;  // populated at round end
  turnInfo:    TurnChangedPayload | null; // active player + timer deadline

  // Connection
  isConnected: boolean;
  error:       string | null;

  // Setters
  setPlayerId:    (id: string)   => void;
  setPlayerName:  (name: string) => void;
  setTableId:     (id: string | null) => void;
  setGameState:   (state: ClientGameState) => void;
  setRoundResult: (result: RoundOverPayload) => void;
  setTurnInfo:    (info: TurnChangedPayload) => void;
  setConnected:   (connected: boolean) => void;
  setError:       (msg: string | null) => void;
  reset:          () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerId:    "",
  playerName:  "",
  tableId:     null,
  gameState:   null,
  roundResult: null,
  turnInfo:    null,
  isConnected: false,
  error:       null,

  setPlayerId:    (id)        => set({ playerId: id }),
  setPlayerName:  (name)      => set({ playerName: name }),
  setTableId:     (id)        => set({ tableId: id }),
  setGameState:   (state)     => set({ gameState: state, error: null }),
  setRoundResult: (result)    => set({ roundResult: result }),
  setTurnInfo:    (info)      => set({ turnInfo: info }),
  setConnected:   (connected) => set({ isConnected: connected }),
  setError:       (msg)       => set({ error: msg }),
  reset:          ()          => set({ tableId: null, gameState: null, roundResult: null, turnInfo: null, isConnected: false, error: null }),
}));

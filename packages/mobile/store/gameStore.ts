// =============================================================================
// gameStore.ts — Zustand store for live game state
//
// This store is the ONLY place game state is written.
// It must only be updated by socket event handlers (via useGameEvents).
// Never update it from local UI actions — server is authoritative.
//
// Java analogy: like a singleton ApplicationState bean that holds the
// current game session data, updated only by the WebSocket message handler.
// =============================================================================

import { create } from "zustand";
import type {
  ClientGameState,
  RoundOverPayload,
  TurnChangedPayload,
} from "@conquer-card/contracts";

interface GameStore {
  // ── Server state ─────────────────────────────────────────────────────────────
  tableId:     string | null;
  gameState:   ClientGameState | null;
  roundResult: RoundOverPayload | null;    // populated at round end, cleared on next round
  turnInfo:    TurnChangedPayload | null;  // active player + timer deadline from server

  // ── Connection ────────────────────────────────────────────────────────────────
  isConnected: boolean;

  // ── Error / rejection ─────────────────────────────────────────────────────────
  // lastRejectionReason: shown in the hint bar, auto-cleared after 3 seconds.
  // error: persistent error (e.g. auth failure).
  lastRejectionReason: string | null;
  error:               string | null;

  // ── Pre-round countdown ───────────────────────────────────────────────────────
  countdownSeconds: number | null;

  // ── Actions ───────────────────────────────────────────────────────────────────
  setTableId:          (id: string | null)         => void;
  setGameState:        (state: ClientGameState)     => void;
  setRoundResult:      (result: RoundOverPayload)   => void;
  setTurnInfo:         (info: TurnChangedPayload)   => void;
  setConnected:        (connected: boolean)         => void;
  setRejectionReason:  (reason: string)             => void;
  clearRejectionReason:()                           => void;
  setError:            (msg: string | null)         => void;
  setCountdown:        (seconds: number | null)     => void;
  reset:               ()                           => void;
}

// Holds the timer ID for auto-clearing rejection reason so we can cancel it
// if a new rejection arrives before the old one expires.
let rejectionClearTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStore>((set) => ({
  tableId:             null,
  gameState:           null,
  roundResult:         null,
  turnInfo:            null,
  isConnected:         false,
  lastRejectionReason: null,
  error:               null,
  countdownSeconds:    null,

  setTableId:    (id)      => set({ tableId: id }),
  setGameState:  (state)   => set({ gameState: state, error: null }),
  setRoundResult:(result)  => set({ roundResult: result }),
  setTurnInfo:   (info)    => set({ turnInfo: info }),
  setConnected:  (c)       => set({ isConnected: c }),

  setRejectionReason: (reason) => {
    // Cancel any pending clear from a previous rejection.
    if (rejectionClearTimer) clearTimeout(rejectionClearTimer);
    set({ lastRejectionReason: reason });
    // Auto-clear after 3 seconds so the hint bar returns to contextual hints.
    rejectionClearTimer = setTimeout(() => {
      set({ lastRejectionReason: null });
      rejectionClearTimer = null;
    }, 3000);
  },

  clearRejectionReason: () => {
    if (rejectionClearTimer) { clearTimeout(rejectionClearTimer); rejectionClearTimer = null; }
    set({ lastRejectionReason: null });
  },

  setError:    (msg)     => set({ error: msg }),
  setCountdown:(seconds) => set({ countdownSeconds: seconds }),

  reset: () => {
    if (rejectionClearTimer) { clearTimeout(rejectionClearTimer); rejectionClearTimer = null; }
    set({
      tableId: null, gameState: null, roundResult: null,
      turnInfo: null, isConnected: false,
      lastRejectionReason: null, error: null, countdownSeconds: null,
    });
  },
}));

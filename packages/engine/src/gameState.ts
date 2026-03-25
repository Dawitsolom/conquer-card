import { GameState, GameAction, Player, GamePhase } from "./types";
import { createDeck, shuffleDeck, dealCards } from "./deck";

const CARDS_PER_PLAYER = 5;
const MAX_ROUNDS = 10;

export function createGameState(roomId: string, players: Pick<Player, "id" | "name">[]): GameState {
  return {
    roomId,
    players: players.map((p) => ({
      ...p,
      hand: [],
      score: 0,
      isConnected: true,
    })),
    deck: [],
    currentPlayerIndex: 0,
    phase: "waiting",
    round: 1,
    maxRounds: MAX_ROUNDS,
  };
}

export function startGame(state: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  const { hands, remaining } = dealCards(deck, state.players.length, CARDS_PER_PLAYER);
  return {
    ...state,
    deck: remaining,
    phase: "playing",
    players: state.players.map((p, i) => ({ ...p, hand: hands[i] ?? [] })),
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  if (state.phase !== "playing") return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

  switch (action.type) {
    case "PLAY_CARD": {
      if (!action.cardId) return state;
      const cardIndex = currentPlayer.hand.findIndex((c) => c.id === action.cardId);
      if (cardIndex === -1) return state;
      const newHand = currentPlayer.hand.filter((c) => c.id !== action.cardId);
      const updatedPlayers = state.players.map((p) =>
        p.id === action.playerId ? { ...p, hand: newHand, score: p.score + 1 } : p
      );
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const nextRound = nextIndex === 0 ? state.round + 1 : state.round;
      const nextPhase: GamePhase = nextRound > state.maxRounds ? "finished" : "playing";
      return { ...state, players: updatedPlayers, currentPlayerIndex: nextIndex, round: nextRound, phase: nextPhase };
    }
    case "PASS": {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      return { ...state, currentPlayerIndex: nextIndex };
    }
    default:
      return state;
  }
}

export function getWinner(state: GameState): Player | null {
  if (state.phase !== "finished") return null;
  return state.players.reduce((best, p) => (p.score > best.score ? p : best), state.players[0] as Player);
}

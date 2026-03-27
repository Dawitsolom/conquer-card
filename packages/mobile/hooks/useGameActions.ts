/**
 * useGameActions — typed action dispatchers for all GameAction variants.
 *
 * Java analogy: a service layer (GameActionService) that wraps the raw
 * socket emit and adds the playerId from the store so callers don't
 * have to pass it every time.
 *
 * Usage in a screen:
 *   const { drawFromDeck, discard, layMeld } = useGameActions(roomId);
 */
import { useGameStore } from "../store/gameStore";
import { useSocket } from "./useSocket";
import type { Card, MeldSpec } from "@conquer-card/engine";

export function useGameActions(tableId: string) {
  const { playerId } = useGameStore();
  const { sendAction } = useSocket();

  return {
    drawFromDeck: () =>
      sendAction(tableId, { type: "DRAW_FROM_DECK", playerId }),

    pickUpDiscard: () =>
      sendAction(tableId, { type: "PICK_UP_DISCARD", playerId }),

    takeFaceUpCard: () =>
      sendAction(tableId, { type: "TAKE_FACE_UP_CARD", playerId }),

    layMeld: (melds: MeldSpec[]) =>
      sendAction(tableId, { type: "LAY_MELD", playerId, melds }),

    addToMeld: (meldId: string, cards: Card[], position: "start" | "end") =>
      sendAction(tableId, { type: "ADD_TO_MELD", playerId, meldId, cards, position }),

    stealJoker: (meldId: string, replacementCard: Card) =>
      sendAction(tableId, { type: "STEAL_JOKER", playerId, meldId, replacementCard }),

    discard: (card: Card) =>
      sendAction(tableId, { type: "DISCARD", playerId, card }),
  };
}

/**
 * ActionHintBar — shows the active player contextual hints about their next action.
 *
 * Rules-aware:
 *  - turnPhase === 'draw'  → player must draw before anything else
 *  - turnPhase === 'play'  → player may lay melds, add to melds, or discard
 *  - Not your turn         → "Waiting for <name>…"
 *  - error present         → shows the ACTION_REJECTED reason in red
 */
import { View, Text, StyleSheet } from "react-native";
import type { ClientGameState } from "@conquer-card/contracts";

type Props = {
  gameState: ClientGameState;
  playerId: string;
  error: string | null;
};

export function ActionHintBar({ gameState, playerId, error }: Props) {
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === playerId;

  let hint: string;
  let hintStyle: object = styles.hint;

  if (error) {
    hint = error;
    hintStyle = styles.error;
  } else if (!isMyTurn) {
    hint = `Waiting for ${activePlayer?.displayName ?? "opponent"}…`;
    hintStyle = styles.waiting;
  } else if (gameState.turnPhase === "draw") {
    hint = "Draw a card — tap the deck, the discard pile, or the face-up card";
  } else {
    hint = "Lay melds, extend, steal a Joker, or discard to end your turn";
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, hintStyle]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f3460",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  text: { fontSize: 13, textAlign: "center" },
  hint:    { color: "#c8d8ff" },
  waiting: { color: "#a0a0c0" },
  error:   { color: "#ff6b6b", fontWeight: "600" },
});

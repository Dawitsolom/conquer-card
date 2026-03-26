import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useSocket } from "../../hooks/useSocket";
import { isOwnPlayer } from "@conquer-card/contracts";
import type { Card } from "@conquer-card/engine";

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { gameState, playerId, roundResult, turnInfo, error } = useGameStore();
  const { joinTable, signalReady, sendAction } = useSocket();

  useEffect(() => {
    if (roomId) joinTable(roomId);
  }, [roomId]);

  const currentPlayerData = gameState?.players.find(p => p.id === playerId);
  const currentPlayer     = currentPlayerData && isOwnPlayer(currentPlayerData) ? currentPlayerData : null;
  const isMyTurn          = gameState?.players[gameState.activePlayerIndex]?.id === playerId;

  const handleDiscard = (card: Card) => {
    if (!isMyTurn || !roomId) return;
    // Correct engine action type: DISCARD (not PLAY_CARD which doesn't exist)
    sendAction(roomId, { type: "DISCARD", playerId, card });
  };

  const handleStartRound = () => {
    if (!roomId) return;
    signalReady(roomId);
  };

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Waiting for players...</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.button} onPress={handleStartRound}>
          <Text style={styles.buttonText}>Start Round</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* roundNumber exists; maxRounds does not exist in engine — removed */}
        <Text style={styles.roundText}>Round {gameState.roundNumber}</Text>
        <Text style={[styles.turnText, isMyTurn && styles.myTurn]}>
          {isMyTurn ? "Your turn!" : "Waiting..."}
        </Text>
      </View>

      {/* Opponent chips — use handCount (not hand.length) for opponents */}
      <View style={styles.players}>
        {gameState.players.map(p => (
          <View key={p.id} style={[styles.playerChip, p.id === playerId && styles.myChip]}>
            {/* displayName (not p.name) */}
            <Text style={styles.playerName}>{p.displayName}</Text>
            {/* p.score doesn't exist — show hand count instead */}
            <Text style={styles.playerScore}>
              {isOwnPlayer(p) ? `${p.hand.length} cards` : `${p.handCount} cards`}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.handLabel}>
        Your Hand ({currentPlayer?.hand.length ?? 0} cards)
      </Text>
      <FlatList
        data={currentPlayer?.hand ?? []}
        keyExtractor={item => item.id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, isMyTurn && styles.cardActive]}
            onPress={() => handleDiscard(item)}
            disabled={!isMyTurn}
          >
            <Text style={styles.cardRank}>{item.rank}</Text>
            <Text style={styles.cardSuit}>{item.suit}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.hand}
      />

      {/* phase === "round_over" (not "finished") */}
      {(gameState.phase === "round_over" || roundResult) && (
        <View style={styles.gameOver}>
          <Text style={styles.gameOverText}>Round Over!</Text>
          {roundResult && (
            <Text style={styles.winnerText}>
              Winner: {gameState.players.find(p => p.id === roundResult.winnerId)?.displayName ?? roundResult.winnerId}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={() => router.push("/")}>
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Turn timer bar — uses timeoutAt from turnInfo */}
      {turnInfo && isMyTurn && (
        <Text style={styles.timer}>
          Time left: {Math.max(0, Math.ceil((turnInfo.timeoutAt - Date.now()) / 1000))}s
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:"#1a1a2e", padding:16 },
  header:       { flexDirection:"row", justifyContent:"space-between", marginBottom:16 },
  title:        { color:"#fff", fontSize:24, textAlign:"center", marginBottom:24 },
  roundText:    { color:"#a0a0c0", fontSize:16 },
  turnText:     { color:"#a0a0c0", fontSize:16 },
  myTurn:       { color:"#e94560", fontWeight:"bold" },
  players:      { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:24 },
  playerChip:   { backgroundColor:"#16213e", padding:8, borderRadius:8, alignItems:"center" },
  myChip:       { borderColor:"#e94560", borderWidth:2 },
  playerName:   { color:"#fff", fontSize:12 },
  playerScore:  { color:"#e94560", fontSize:14, fontWeight:"bold" },
  handLabel:    { color:"#a0a0c0", fontSize:14, marginBottom:12 },
  hand:         { paddingBottom:16 },
  card:         { width:80, height:120, backgroundColor:"#16213e", borderRadius:12, margin:4, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#333" },
  cardActive:   { borderColor:"#e94560", transform:[{scale:1.05}] },
  cardRank:     { color:"#fff", fontSize:28, fontWeight:"bold" },
  cardSuit:     { color:"#a0a0c0", fontSize:12, textTransform:"capitalize" },
  button:       { backgroundColor:"#e94560", padding:16, borderRadius:12, alignItems:"center", marginTop:16 },
  buttonText:   { color:"#fff", fontSize:16, fontWeight:"600" },
  gameOver:     { alignItems:"center", marginTop:32 },
  gameOverText: { color:"#fff", fontSize:32, fontWeight:"bold", marginBottom:16 },
  winnerText:   { color:"#e94560", fontSize:18, marginBottom:16 },
  error:        { color:"#ff6b6b", fontSize:14, textAlign:"center", marginTop:8 },
  timer:        { color:"#e94560", fontSize:14, textAlign:"center", marginTop:8 },
});

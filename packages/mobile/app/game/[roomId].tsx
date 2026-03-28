// =============================================================================
// game/[roomId].tsx — Table screen
//
// Architecture rule: this screen is a VIEW only.
// It renders server state from gameStore and sends player intents via useSocket.
// No game logic lives here — engine is the source of truth.
// =============================================================================

import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { useSocket } from "../../hooks/useSocket";
import { useGameEvents } from "../../hooks/useGameEvents";
import { isOwnPlayer } from "@conquer-card/contracts";
import type { ClientPlayer } from "@conquer-card/contracts";
import type { Card } from "@conquer-card/engine";

// ── Turn timer ────────────────────────────────────────────────────────────────
// Calculates seconds remaining from the server-provided deadline.
// Re-renders every second via setInterval — does NOT drive game logic.
function useTurnTimer(timeoutAt: number | null): number {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (timeoutAt === null) { setSecondsLeft(0); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeoutAt]);
  return secondsLeft;
}

// ── Opponent position labels ──────────────────────────────────────────────────
// With 2–4 players:
//   Index 0 = self (bottom), others distributed top/left/right
const OPPONENT_POSITIONS = ["TOP", "LEFT", "RIGHT"] as const;

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();

  const {
    gameState, roundResult, turnInfo,
    lastRejectionReason, countdownSeconds,
    isConnected, error, setTableId, reset,
  } = useGameStore();
  const playerId = useAuthStore(s => s.user?.uid ?? "");

  const { socket, joinTable, leaveTable, signalReady, sendAction } = useSocket();
  useGameEvents(socket);

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    setTableId(roomId);
    joinTable(roomId);
    return () => {
      leaveTable(roomId);
      reset();
    };
  }, [roomId]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const myPlayerData   = gameState?.players.find(p => p.id === playerId);
  const myPlayer       = myPlayerData && isOwnPlayer(myPlayerData) ? myPlayerData : null;
  const isMyTurn       = gameState?.players[gameState.activePlayerIndex]?.id === playerId;
  const activePlayerId = gameState ? gameState.players[gameState.activePlayerIndex]?.id : null;
  const timeoutAt      = turnInfo?.timeoutAt ?? null;
  const secondsLeft    = useTurnTimer(isMyTurn ? timeoutAt : null);

  const opponents: ClientPlayer[] = gameState
    ? gameState.players.filter(p => p.id !== playerId)
    : [];

  // ── Card selection ────────────────────────────────────────────────────────
  const toggleCard = useCallback((card: Card) => {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card],
    );
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDraw = () => {
    if (!isMyTurn || !roomId) return;
    sendAction(roomId, { type: "DRAW_FROM_DECK", playerId });
  };

  const handleDiscard = () => {
    if (!isMyTurn || !roomId || selectedCards.length !== 1) return;
    sendAction(roomId, { type: "DISCARD", playerId, card: selectedCards[0]! });
    setSelectedCards([]);
  };

  // ── Waiting screen ────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <View style={styles.container}>
        {!isConnected && <Text style={styles.reconnecting}>Reconnecting…</Text>}
        <Text style={styles.waitingText}>
          {countdownSeconds !== null
            ? `Game starts in ${countdownSeconds}s…`
            : "Waiting for players…"}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.button} onPress={() => roomId && signalReady(roomId)}>
          <Text style={styles.buttonText}>Ready</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveButton} onPress={() => router.replace("/")}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Round over overlay ────────────────────────────────────────────────────
  if (gameState.phase === "round_over" || roundResult) {
    const winner = roundResult
      ? gameState.players.find(p => p.id === roundResult.winnerId)
      : null;
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Round Over!</Text>
          {winner && <Text style={styles.overlayWinner}>{winner.displayName} wins</Text>}
          {roundResult?.winType === "joker" && (
            <Text style={styles.overlayBonus}>Joker Finish — 2× coins!</Text>
          )}
          {roundResult?.winType === "perfect_hand" && (
            <Text style={styles.overlayBonus}>Perfect Hand — 2× coins!</Text>
          )}
          {roundResult && (
            <View style={styles.payouts}>
              {gameState.players.map(p => {
                const payout = roundResult.payouts[p.id];
                const delta  = payout ?? 0;
                return (
                  <Text key={p.id} style={[styles.payoutRow, delta >= 0 ? styles.payoutPos : styles.payoutNeg]}>
                    {p.displayName}: {delta >= 0 ? "+" : ""}{delta} coins
                  </Text>
                );
              })}
            </View>
          )}
          <TouchableOpacity style={styles.button} onPress={() => roomId && signalReady(roomId)}>
            <Text style={styles.buttonText}>Next Round</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leaveButton} onPress={() => { leaveTable(roomId ?? ""); router.replace("/"); }}>
            <Text style={styles.leaveText}>Leave Table</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main game table ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Reconnecting banner */}
      {!isConnected && (
        <View style={styles.reconnectBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.reconnectText}>Reconnecting…</Text>
        </View>
      )}

      {/* Opponents */}
      <View style={styles.opponentsRow}>
        {opponents.map((opp, i) => {
          const pos      = OPPONENT_POSITIONS[i] ?? "TOP";
          const isActive = opp.id === activePlayerId;
          const count    = isOwnPlayer(opp) ? opp.hand.length : opp.handCount;
          return (
            <View key={opp.id} style={[styles.opponentSlot, isActive && styles.activeSlot]}>
              <Text style={styles.opponentName}>{opp.displayName}</Text>
              <Text style={styles.opponentPos}>{pos}</Text>
              <Text style={styles.opponentCards}>{count} cards</Text>
            </View>
          );
        })}
      </View>

      {/* Meld zone — all players' melds */}
      {gameState.allMelds.length > 0 && (
        <View style={styles.meldZone}>
          <Text style={styles.sectionLabel}>Melds on table</Text>
          <FlatList
            data={gameState.allMelds}
            keyExtractor={m => m.id}
            horizontal
            renderItem={({ item: meld }) => (
              <View style={styles.meldGroup}>
                <Text style={styles.meldOwner}>
                  {gameState.players.find(p => p.id === meld.ownerId)?.displayName ?? "?"}
                </Text>
                <View style={styles.meldCards}>
                  {meld.cards.map(c => (
                    <Text key={c.id} style={styles.meldCard}>{c.rank}{c.suit[0]?.toUpperCase()}</Text>
                  ))}
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Draw pile + discard pile + face-up card */}
      <View style={styles.pileRow}>
        <TouchableOpacity style={styles.pile} onPress={handleDraw} disabled={!isMyTurn}>
          <Text style={styles.pileIcon}>🂠</Text>
          <Text style={styles.pileCount}>{gameState.drawPileCount}</Text>
        </TouchableOpacity>

        <View style={styles.pile}>
          <Text style={styles.pileLabel}>Discard</Text>
          {gameState.discardPile.length > 0 ? (
            <Text style={styles.pileCard}>
              {(() => { const c = gameState.discardPile[gameState.discardPile.length - 1]!; return `${c.rank}${c.suit[0]?.toUpperCase()}`; })()}
            </Text>
          ) : (
            <Text style={styles.pileEmpty}>—</Text>
          )}
        </View>

        {gameState.faceUpCard && (
          <View style={[styles.pile, styles.faceUpPile]}>
            <Text style={styles.pileLabel}>Face-up</Text>
            <Text style={styles.pileCard}>
              {gameState.faceUpCard.rank}{gameState.faceUpCard.suit[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Turn timer */}
      {isMyTurn && timeoutAt !== null && (
        <View style={styles.timerRow}>
          <View style={[styles.timerBar, { width: `${(secondsLeft / 30) * 100}%` }]} />
          <Text style={styles.timerText}>{secondsLeft}s</Text>
        </View>
      )}

      {/* Hint bar — rejection reason or contextual hint */}
      <View style={styles.hintBar}>
        <Text style={styles.hintText}>
          {lastRejectionReason
            ? lastRejectionReason
            : isMyTurn
              ? selectedCards.length === 0
                ? "Tap the deck to draw, or tap a card to select"
                : "Tap Discard to discard the selected card"
              : `Waiting for ${gameState.players[gameState.activePlayerIndex]?.displayName ?? "…"}…`
          }
        </Text>
      </View>

      {/* Own hand */}
      <Text style={styles.handLabel}>Your Hand ({myPlayer?.hand.length ?? 0})</Text>
      <FlatList
        data={myPlayer?.hand ?? []}
        keyExtractor={c => c.id}
        horizontal
        renderItem={({ item: card }) => {
          const selected = selectedCards.some(c => c.id === card.id);
          return (
            <TouchableOpacity
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => toggleCard(card)}
            >
              <Text style={styles.cardRank}>{card.rank}</Text>
              <Text style={styles.cardSuit}>{card.suit[0]?.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.hand}
      />

      {/* Action buttons */}
      {isMyTurn && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDraw}>
            <Text style={styles.actionText}>Draw</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, selectedCards.length !== 1 && styles.actionDisabled]}
            onPress={handleDiscard}
            disabled={selectedCards.length !== 1}
          >
            <Text style={styles.actionText}>Discard</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#1a1a2e", padding: 12 },
  reconnectBanner:{ flexDirection: "row", alignItems: "center", backgroundColor: "#333", padding: 8, borderRadius: 8, marginBottom: 8, gap: 8 },
  reconnectText:  { color: "#fff", fontSize: 13 },
  waitingText:    { color: "#fff", fontSize: 20, textAlign: "center", marginTop: 80 },
  reconnecting:   { color: "#e94560", textAlign: "center", marginBottom: 8 },
  opponentsRow:   { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  opponentSlot:   { backgroundColor: "#16213e", padding: 8, borderRadius: 10, alignItems: "center", minWidth: 80 },
  activeSlot:     { borderColor: "#e94560", borderWidth: 2 },
  opponentName:   { color: "#fff", fontSize: 11, fontWeight: "600" },
  opponentPos:    { color: "#555", fontSize: 9 },
  opponentCards:  { color: "#a0a0c0", fontSize: 11 },
  meldZone:       { marginBottom: 10 },
  sectionLabel:   { color: "#a0a0c0", fontSize: 11, marginBottom: 4 },
  meldGroup:      { backgroundColor: "#16213e", borderRadius: 8, padding: 6, marginRight: 8 },
  meldOwner:      { color: "#a0a0c0", fontSize: 9, marginBottom: 2 },
  meldCards:      { flexDirection: "row", gap: 4 },
  meldCard:       { color: "#fff", fontSize: 13, fontWeight: "600" },
  pileRow:        { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 10 },
  pile:           { backgroundColor: "#16213e", padding: 10, borderRadius: 10, alignItems: "center", minWidth: 60 },
  faceUpPile:     { borderColor: "#ffd700", borderWidth: 1 },
  pileIcon:       { fontSize: 28 },
  pileCount:      { color: "#a0a0c0", fontSize: 12 },
  pileLabel:      { color: "#a0a0c0", fontSize: 10 },
  pileCard:       { color: "#fff", fontSize: 20, fontWeight: "bold" },
  pileEmpty:      { color: "#555", fontSize: 20 },
  timerRow:       { height: 8, backgroundColor: "#333", borderRadius: 4, marginBottom: 6, overflow: "hidden", position: "relative" },
  timerBar:       { height: 8, backgroundColor: "#e94560", borderRadius: 4 },
  timerText:      { position: "absolute", right: 4, top: -4, color: "#fff", fontSize: 10 },
  hintBar:        { backgroundColor: "#16213e", padding: 8, borderRadius: 8, marginBottom: 8 },
  hintText:       { color: "#a0a0c0", fontSize: 12, textAlign: "center" },
  handLabel:      { color: "#a0a0c0", fontSize: 12, marginBottom: 4 },
  hand:           { paddingBottom: 4 },
  card:           { width: 60, height: 90, backgroundColor: "#16213e", borderRadius: 10, margin: 3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#333" },
  cardSelected:   { borderColor: "#e94560", transform: [{ translateY: -8 }] },
  cardRank:       { color: "#fff", fontSize: 20, fontWeight: "bold" },
  cardSuit:       { color: "#a0a0c0", fontSize: 10 },
  actions:        { flexDirection: "row", gap: 12, marginTop: 8, justifyContent: "center" },
  actionBtn:      { backgroundColor: "#e94560", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  actionDisabled: { backgroundColor: "#555" },
  actionText:     { color: "#fff", fontSize: 15, fontWeight: "600" },
  overlay:        { flex: 1, alignItems: "center", justifyContent: "center" },
  overlayTitle:   { color: "#fff", fontSize: 32, fontWeight: "bold", marginBottom: 8 },
  overlayWinner:  { color: "#e94560", fontSize: 22, marginBottom: 8 },
  overlayBonus:   { color: "#ffd700", fontSize: 16, marginBottom: 16 },
  payouts:        { marginBottom: 24 },
  payoutRow:      { fontSize: 16, marginBottom: 4 },
  payoutPos:      { color: "#4caf50" },
  payoutNeg:      { color: "#e94560" },
  button:         { backgroundColor: "#e94560", padding: 14, borderRadius: 10, alignItems: "center", minWidth: 180, marginBottom: 10 },
  buttonText:     { color: "#fff", fontSize: 16, fontWeight: "600" },
  leaveButton:    { padding: 14, alignItems: "center" },
  leaveText:      { color: "#666", fontSize: 14 },
  error:          { color: "#ff6b6b", fontSize: 12, textAlign: "center", marginTop: 6 },
});

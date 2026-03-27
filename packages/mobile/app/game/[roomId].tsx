/**
 * Game screen — the main playable view.
 *
 * Layout (top to bottom):
 *   Header          — round number, connection dot, turn timer
 *   Opponents       — chips for each non-self player (handCount, displayName)
 *   Draw zone       — deck button + discard pile top card + face-up card
 *   ActionHintBar   — context-sensitive help / rejected reason
 *   Hand            — horizontal scroll of the player's own cards
 *   Action buttons  — Discard (when one card selected)
 *   Meld zone       — allMelds on the table
 *   Round-over overlay
 */
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGameStore } from "../../store/gameStore";
import { useSocket } from "../../hooks/useSocket";
import { useGameActions } from "../../hooks/useGameActions";
import { ActionHintBar } from "../../components/ActionHintBar";
import { isOwnPlayer } from "@conquer-card/contracts";
import type { Card } from "@conquer-card/engine";

// ─── Turn countdown hook ───────────────────────────────────────────────────────

function useTurnCountdown(timeoutAt: number | null): number {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!timeoutAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [timeoutAt]);
  return secondsLeft;
}

// ─── Card pill ─────────────────────────────────────────────────────────────────

function CardPill({ card, active, onPress }: { card: Card; active: boolean; onPress?: () => void }) {
  const suitColour = ["♥", "♦"].includes(card.suit) ? "#e94560" : "#1a1a2e";
  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.cardRank, { color: suitColour }]}>{card.rank}</Text>
      <Text style={[styles.cardSuit, { color: suitColour }]}>{card.suit}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const {
    gameState, playerId, roundResult, turnInfo, error, isConnected, setError,
  } = useGameStore();
  const { joinTable, signalReady, leaveTable } = useSocket();
  const actions = useGameActions(roomId ?? "");

  const secondsLeft = useTurnCountdown(turnInfo?.timeoutAt ?? null);

  useEffect(() => {
    if (roomId) joinTable(roomId);
    return () => { if (roomId) leaveTable(roomId); };
  }, [roomId]);

  // Auto-clear action-rejected errors after 3 s.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(id);
  }, [error]);

  // Card selection state for multi-card discard / meld flows.
  const [selected, setSelected] = useState<Card[]>([]);

  const toggleSelect = useCallback((card: Card) => {
    setSelected(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card]
    );
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const me = gameState?.players.find(p => p.id === playerId);
  const myPlayer    = me && isOwnPlayer(me) ? me : null;
  const isMyTurn    = gameState?.players[gameState.activePlayerIndex]?.id === playerId;
  const canDraw     = isMyTurn && gameState?.turnPhase === "draw";
  const canPlay     = isMyTurn && gameState?.turnPhase === "play";
  const topDiscard  = gameState?.discardPile.at(-1) ?? null;

  const handleDiscard = useCallback(() => {
    if (!canPlay || selected.length !== 1) return;
    actions.discard(selected[0]!);
    setSelected([]);
  }, [canPlay, selected, actions]);

  // ── Lobby / loading state ──────────────────────────────────────────────────
  if (!gameState) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e94560" size="large" />
        <Text style={styles.waitingText}>Waiting for players…</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => roomId && signalReady(roomId)}>
          <Text style={styles.btnText}>Ready</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace("/")}>
          <Text style={styles.ghostText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showRoundOver = gameState.phase === "round_over" || !!roundResult;
  const winnerName = roundResult
    ? (gameState.players.find(p => p.id === roundResult.winnerId)?.displayName ?? "Someone")
    : null;

  return (
    <View style={styles.root}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.roundLabel}>Round {gameState.roundNumber}</Text>
        <View style={styles.connRow}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? "#4caf50" : "#888" }]} />
          {isMyTurn && secondsLeft > 0 && (
            <Text style={[styles.timerText, secondsLeft <= 10 && styles.timerUrgent]}>
              {secondsLeft}s
            </Text>
          )}
        </View>
      </View>

      {/* ── Opponents ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.opponentsScroll}>
        {gameState.players
          .filter(p => p.id !== playerId)
          .map(p => (
            <View key={p.id} style={styles.opponentChip}>
              <Text style={styles.opponentName} numberOfLines={1}>{p.displayName}</Text>
              <Text style={styles.opponentCards}>
                {isOwnPlayer(p) ? p.hand.length : p.handCount} cards
              </Text>
            </View>
          ))}
      </ScrollView>

      {/* ── Draw zone ── */}
      <View style={styles.drawZone}>
        {/* Draw deck */}
        <TouchableOpacity
          style={[styles.deckBtn, !canDraw && styles.disabled]}
          onPress={() => canDraw && actions.drawFromDeck()}
          disabled={!canDraw}
        >
          <Text style={styles.deckGlyph}>🂠</Text>
          <Text style={styles.deckCount}>{gameState.drawPileCount}</Text>
        </TouchableOpacity>

        {/* Discard pile top */}
        {topDiscard ? (
          <TouchableOpacity
            style={!canDraw ? styles.disabled : undefined}
            onPress={() => canDraw && actions.pickUpDiscard()}
            disabled={!canDraw}
          >
            <CardPill card={topDiscard} active={false} />
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyDiscard}>
            <Text style={styles.emptyDiscardText}>—</Text>
          </View>
        )}

        {/* Face-up card (claim only to finish, only if player has zero melds) */}
        {gameState.faceUpCard && (
          <View style={styles.faceUpWrapper}>
            <Text style={styles.faceUpLabel}>Face-up</Text>
            <TouchableOpacity
              style={!canDraw && styles.disabled}
              onPress={() => canDraw && actions.takeFaceUpCard()}
              disabled={!canDraw}
            >
              <CardPill card={gameState.faceUpCard} active={false} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Action hint bar ── */}
      <ActionHintBar gameState={gameState} playerId={playerId} error={error} />

      {/* ── Your hand ── */}
      <Text style={styles.handLabel}>
        Your hand ({myPlayer?.hand.length ?? 0})
        {selected.length > 0 && ` · ${selected.length} selected`}
      </Text>
      <FlatList
        data={myPlayer?.hand ?? []}
        keyExtractor={item => item.id}
        horizontal
        renderItem={({ item }) => (
          <CardPill
            card={item}
            active={selected.some(c => c.id === item.id)}
            onPress={canPlay ? () => toggleSelect(item) : undefined}
          />
        )}
        contentContainerStyle={styles.handList}
      />

      {/* ── Action buttons (play phase) ── */}
      {canPlay && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.actionBtn, selected.length !== 1 && styles.disabled]}
            onPress={handleDiscard}
            disabled={selected.length !== 1}
          >
            <Text style={styles.btnText}>Discard</Text>
          </TouchableOpacity>
          {selected.length > 0 && (
            <TouchableOpacity
              style={[styles.secondaryBtn, styles.actionBtn]}
              onPress={() => setSelected([])}
            >
              <Text style={styles.btnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Table melds ── */}
      {gameState.allMelds.length > 0 && (
        <View style={styles.meldSection}>
          <Text style={styles.meldSectionLabel}>Table melds</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {gameState.allMelds.map(meld => (
              <View key={meld.id} style={styles.meldGroup}>
                {meld.cards.map(c => (
                  <CardPill key={c.id} card={c} active={false} />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Round-over overlay ── */}
      {showRoundOver && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Round Over!</Text>
          {winnerName && <Text style={styles.overlayWinner}>🏆 {winnerName} wins</Text>}
          {roundResult && (
            <Text style={styles.overlayPayout}>
              Your payout: {roundResult.payouts[playerId] ?? 0} coins
            </Text>
          )}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => roomId && signalReady(roomId)}
          >
            <Text style={styles.btnText}>Play again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace("/")}>
            <Text style={styles.ghostText}>Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#1a1a2e" },
  center:            { flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center", padding: 24 },

  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  roundLabel:        { color: "#a0a0c0", fontSize: 14 },
  connRow:           { flexDirection: "row", alignItems: "center", gap: 8 },
  connDot:           { width: 8, height: 8, borderRadius: 4 },
  timerText:         { color: "#e94560", fontSize: 14, fontWeight: "700" },
  timerUrgent:       { color: "#ff3333" },

  opponentsScroll:   { maxHeight: 68, paddingHorizontal: 12, marginBottom: 8 },
  opponentChip:      { backgroundColor: "#16213e", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, alignItems: "center" },
  opponentName:      { color: "#fff", fontSize: 12, maxWidth: 90 },
  opponentCards:     { color: "#a0a0c0", fontSize: 11 },

  drawZone:          { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 14, paddingHorizontal: 16, marginBottom: 8 },
  deckBtn:           { width: 56, height: 84, backgroundColor: "#16213e", borderRadius: 8, borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  deckGlyph:         { fontSize: 30, color: "#fff" },
  deckCount:         { color: "#a0a0c0", fontSize: 10 },
  emptyDiscard:      { width: 56, height: 84, borderRadius: 8, borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  emptyDiscardText:  { color: "#555", fontSize: 24 },
  faceUpWrapper:     { alignItems: "center" },
  faceUpLabel:       { color: "#a0a0c0", fontSize: 10, marginBottom: 2 },

  handLabel:         { color: "#a0a0c0", fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
  handList:          { paddingHorizontal: 12, paddingBottom: 8 },

  card:              { width: 52, height: 80, backgroundColor: "#f8f8f8", borderRadius: 7, margin: 3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ddd" },
  cardActive:        { borderColor: "#e94560", borderWidth: 2.5, transform: [{ translateY: -8 }] },
  cardRank:          { fontSize: 20, fontWeight: "700" },
  cardSuit:          { fontSize: 11 },

  actionRow:         { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  actionBtn:         { flex: 1 },
  primaryBtn:        { backgroundColor: "#e94560", padding: 14, borderRadius: 10, alignItems: "center" },
  secondaryBtn:      { backgroundColor: "#0f3460", padding: 14, borderRadius: 10, alignItems: "center" },
  ghostBtn:          { padding: 14, alignItems: "center", marginTop: 6 },
  btnText:           { color: "#fff", fontSize: 16, fontWeight: "600" },
  ghostText:         { color: "#a0a0c0", fontSize: 14 },
  disabled:          { opacity: 0.35 },

  meldSection:       { paddingHorizontal: 12, marginBottom: 10 },
  meldSectionLabel:  { color: "#a0a0c0", fontSize: 12, marginBottom: 6 },
  meldGroup:         { flexDirection: "row", backgroundColor: "#16213e", borderRadius: 8, padding: 4, marginRight: 8 },

  overlay:           { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,20,0.93)", alignItems: "center", justifyContent: "center", padding: 32 },
  overlayTitle:      { color: "#fff", fontSize: 36, fontWeight: "800", marginBottom: 12 },
  overlayWinner:     { color: "#e94560", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  overlayPayout:     { color: "#a0a0c0", fontSize: 16, marginBottom: 32 },

  waitingText:       { color: "#a0a0c0", fontSize: 18, marginTop: 16, marginBottom: 24 },
  errorText:         { color: "#ff6b6b", fontSize: 14, marginBottom: 12, textAlign: "center" },
});

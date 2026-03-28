// =============================================================================
// game/[roomId].tsx — Table screen
//
// Architecture rule: this screen is a VIEW only.
// It renders server state from gameStore and sends player intents via useSocket.
// No game logic lives here — engine is the source of truth.
//
// Discard button is VISUALLY locked in certain states, but the emit is NOT
// blocked — the server rejects invalid actions and returns the reason, which
// appears in the hint bar. The lock is UX only.
// =============================================================================

import {
  View, Text, TouchableOpacity, FlatList, Modal,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { useSocket } from "../../hooks/useSocket";
import { useGameEvents } from "../../hooks/useGameEvents";
import { isOwnPlayer } from "../../contracts";
import type { ClientPlayer, OwnClientPlayer } from "../../contracts";
import type { Card, MeldType } from "../../../engine/dist";
import {
  getHintMessage,
  getDiscardLockReason,
  computePoints,
  countMelds,
  detectMeldType,
} from "../../utils/hintMessages";

const EMOJI_OPTIONS = ["😂", "😮", "😠", "🔥", "👏", "🤔", "😎", "🙏"];
const OPPONENT_POSITIONS = ["TOP", "LEFT", "RIGHT"] as const;

// ── Turn timer ────────────────────────────────────────────────────────────────
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

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();

  const {
    gameState, roundResult, turnInfo,
    lastRejectionReason, countdownSeconds,
    isConnected, error,
    setTableId, reset,
  } = useGameStore();
  const playerId = useAuthStore(s => s.user?.uid ?? "");

  const { socket, joinTable, leaveTable, signalReady, sendAction, sendEmoji } = useSocket();
  useGameEvents(socket);

  const [selectedCards,  setSelectedCards]  = useState<Card[]>([]);
  const [showEmoji,      setShowEmoji]      = useState(false);
  // actionBusy: disable all action buttons after emit, until next STATE_UPDATE
  const [actionBusy,     setActionBusy]     = useState(false);

  // Clear busy state when a new server state arrives
  useEffect(() => { setActionBusy(false); }, [gameState]);

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
  const myPlayer: OwnClientPlayer | null =
    myPlayerData && isOwnPlayer(myPlayerData) ? myPlayerData : null;
  const isMyTurn    = gameState?.players[gameState.activePlayerIndex]?.id === playerId;
  const activePlayerId = gameState?.players[gameState.activePlayerIndex]?.id ?? null;
  const timeoutAt   = turnInfo?.timeoutAt ?? null;
  const secondsLeft = useTurnTimer(isMyTurn ? timeoutAt : null);

  const opponents: ClientPlayer[] = useMemo(
    () => gameState ? gameState.players.filter(p => p.id !== playerId) : [],
    [gameState, playerId],
  );

  const isSolo = useMemo(
    () => !!gameState?.players.some(p => p.isBot),
    [gameState],
  );

  // ── Selection-derived values (for hint bar + LAY MELD button label) ───────
  const selectedPoints   = useMemo(() => computePoints(selectedCards), [selectedCards]);
  const selectedMeldCount = useMemo(() => countMelds(selectedCards),   [selectedCards]);
  const detectedMeldType: MeldType | null = useMemo(
    () => detectMeldType(selectedCards),
    [selectedCards],
  );

  // ── Hint bar ──────────────────────────────────────────────────────────────
  const hintMessage = useMemo(() => {
    if (!isMyTurn) {
      const activeName = gameState?.players[gameState.activePlayerIndex]?.displayName;
      return activeName ? `Waiting for ${activeName}…` : "Waiting…";
    }
    return getHintMessage(
      { myPlayer, isMyTurn, selectedCards, detectedMeldType, selectedPoints, selectedMeldCount },
      lastRejectionReason,
    );
  }, [isMyTurn, myPlayer, selectedCards, detectedMeldType, selectedPoints, selectedMeldCount, lastRejectionReason, gameState]);

  // ── Discard lock ──────────────────────────────────────────────────────────
  const discardLockReason = useMemo(
    () => isMyTurn ? getDiscardLockReason(myPlayer, selectedCards[0] ?? null) : "Not your turn",
    [isMyTurn, myPlayer, selectedCards],
  );
  const discardLocked = discardLockReason !== null || selectedCards.length !== 1;

  // ── Card selection ────────────────────────────────────────────────────────
  const toggleCard = useCallback((card: Card) => {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card],
    );
  }, []);

  // ── Emit wrapper (sets busy, clears selection) ────────────────────────────
  const emit = useCallback((action: Parameters<typeof sendAction>[1]) => {
    if (!roomId || actionBusy) return;
    setActionBusy(true);
    sendAction(roomId, action);
    setSelectedCards([]);
  }, [roomId, actionBusy, sendAction]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleDraw = () =>
    emit({ type: "DRAW_FROM_DECK", playerId });

  const handlePickUpDiscard = () =>
    emit({ type: "PICK_UP_DISCARD", playerId });

  const handleDiscard = () => {
    if (selectedCards.length !== 1) return;
    // Always emit — server rejects if invalid and returns reason for hint bar.
    emit({ type: "DISCARD", playerId, card: selectedCards[0]! });
  };

  const handleLayMeld = () => {
    if (selectedCards.length < 3 || !detectedMeldType) return;
    emit({
      type: "LAY_MELD",
      playerId,
      melds: [{ cards: selectedCards, meldType: detectedMeldType }],
    });
  };

  const handleAddToMeld = (meldId: string) => {
    if (selectedCards.length === 0) return;
    // Append to end — server validates position
    emit({ type: "ADD_TO_MELD", playerId, meldId, cards: selectedCards, position: "end" });
  };

  const handleTakeFaceUp = () =>
    emit({ type: "TAKE_FACE_UP_CARD", playerId });

  const handleStealJoker = (meldId: string) => {
    if (selectedCards.length !== 1) return;
    emit({ type: "STEAL_JOKER", playerId, meldId, replacementCard: selectedCards[0]! });
  };

  const handleEmoji = (emoji: string) => {
    if (!roomId) return;
    sendEmoji(roomId, emoji);
    setShowEmoji(false);
  };

  // ── LAY MELD button label ─────────────────────────────────────────────────
  const layMeldLabel = useMemo(() => {
    if (selectedCards.length < 3) return "LAY MELD";
    if (selectedMeldCount >= 3) return `LAY MELD (${selectedMeldCount} melds ✓)`;
    if (selectedPoints >= 41)   return `LAY MELD (${selectedPoints}pts ✓)`;
    return `LAY MELD (${selectedPoints}pts)`;
  }, [selectedCards.length, selectedMeldCount, selectedPoints]);

  // ── Waiting screen ────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <View style={styles.container}>
        {!isConnected && (
          <View style={styles.reconnectBanner}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.reconnectText}>Reconnecting…</Text>
          </View>
        )}
        <Text style={styles.waitingText}>
          {countdownSeconds !== null
            ? `Game starts in ${countdownSeconds}s…`
            : isSolo ? "Setting up bots…" : "Waiting for players…"}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        {!isSolo && (
          <TouchableOpacity style={styles.button} onPress={() => roomId && signalReady(roomId)}>
            <Text style={styles.buttonText}>Ready</Text>
          </TouchableOpacity>
        )}
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
                const delta = roundResult.payouts[p.id] ?? 0;
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
      {/* Reconnect banner */}
      {!isConnected && (
        <View style={styles.reconnectBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.reconnectText}>Reconnecting… actions disabled</Text>
        </View>
      )}

      {/* Solo mode badge */}
      {isSolo && (
        <View style={styles.soloBadge}>
          <Text style={styles.soloBadgeText}>🤖 SOLO MODE · Practice Round</Text>
        </View>
      )}

      {/* Opponents */}
      <View style={styles.opponentsRow}>
        {opponents.map((opp, i) => {
          const pos      = OPPONENT_POSITIONS[i] ?? "TOP";
          const isActive = opp.id === activePlayerId;
          const count    = isOwnPlayer(opp) ? opp.hand.length : opp.handCount;
          const avatar   = opp.isBot ? "🤖" : opp.displayName.charAt(0).toUpperCase();
          return (
            <View key={opp.id} style={[styles.opponentSlot, isActive && styles.activeSlot]}>
              <Text style={styles.opponentAvatar}>{avatar}</Text>
              <Text style={styles.opponentName} numberOfLines={1}>{opp.displayName}</Text>
              <Text style={styles.opponentPos}>{pos}</Text>
              <Text style={styles.opponentCards}>{count} cards</Text>
              {!isSolo && (
                <TouchableOpacity onPress={() => setShowEmoji(true)}>
                  <Text style={styles.emojiTrigger}>😊</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Meld zone */}
      {gameState.allMelds.length > 0 && (
        <View style={styles.meldZone}>
          <Text style={styles.sectionLabel}>Melds on table</Text>
          <FlatList
            data={gameState.allMelds}
            keyExtractor={m => m.id}
            horizontal
            renderItem={({ item: meld }) => {
              const hasJoker = meld.cards.some(c => c.rank === "JOKER");
              return (
                <TouchableOpacity
                  style={styles.meldGroup}
                  onPress={() => isMyTurn && selectedCards.length > 0 && handleAddToMeld(meld.id)}
                  onLongPress={() => {
                    if (isMyTurn && hasJoker && selectedCards.length === 1) {
                      handleStealJoker(meld.id);
                    }
                  }}
                >
                  <Text style={styles.meldOwner}>
                    {gameState.players.find(p => p.id === meld.ownerId)?.displayName ?? "?"}
                  </Text>
                  <View style={styles.meldCards}>
                    {meld.cards.map(c => (
                      <Text
                        key={c.id}
                        style={[styles.meldCard, c.rank === "JOKER" && styles.jokerCard]}
                      >
                        {c.rank === "JOKER" ? "★" : `${c.rank}${c.suit[0]?.toUpperCase()}`}
                      </Text>
                    ))}
                  </View>
                  {hasJoker && <Text style={styles.stealHint}>long-press to steal Joker</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Draw pile + discard pile + face-up card */}
      <View style={styles.pileRow}>
        {/* Draw pile */}
        <TouchableOpacity
          style={styles.pile}
          onPress={handleDraw}
          disabled={!isMyTurn || actionBusy || !isConnected}
        >
          <Text style={styles.pileIcon}>🂠</Text>
          <Text style={styles.pileCount}>{gameState.drawPileCount}</Text>
        </TouchableOpacity>

        {/* Discard pile — tap to pick up */}
        <TouchableOpacity
          style={styles.pile}
          onPress={handlePickUpDiscard}
          disabled={!isMyTurn || actionBusy || !isConnected}
        >
          <Text style={styles.pileLabel}>Discard</Text>
          {gameState.discardPile.length > 0 ? (() => {
            const c = gameState.discardPile[gameState.discardPile.length - 1]!;
            return <Text style={styles.pileCard}>{c.rank}{c.suit[0]?.toUpperCase()}</Text>;
          })() : <Text style={styles.pileEmpty}>—</Text>}
        </TouchableOpacity>

        {/* Face-up card — pulses gold when eligible */}
        {gameState.faceUpCard && (
          <TouchableOpacity
            style={[
              styles.pile,
              styles.faceUpPile,
              myPlayer?.faceUpEligible && styles.faceUpEligible,
            ]}
            onPress={handleTakeFaceUp}
            disabled={!isMyTurn || !myPlayer?.faceUpEligible || actionBusy || !isConnected}
          >
            <Text style={styles.pileLabel}>Face-up</Text>
            <Text style={styles.pileCard}>
              {gameState.faceUpCard.rank}{gameState.faceUpCard.suit[0]?.toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Turn timer bar */}
      {isMyTurn && timeoutAt !== null && (
        <View style={styles.timerRow}>
          <View style={[styles.timerBar, { width: `${(secondsLeft / 30) * 100}%` }]} />
          <Text style={styles.timerText}>{secondsLeft}s</Text>
        </View>
      )}

      {/* Hint bar */}
      <View style={[styles.hintBar, lastRejectionReason ? styles.hintBarError : null]}>
        <Text style={styles.hintText}>{hintMessage}</Text>
      </View>

      {/* Own hand */}
      <Text style={styles.handLabel}>Your Hand ({myPlayer?.hand.length ?? 0})</Text>
      <FlatList
        data={myPlayer?.hand ?? []}
        keyExtractor={c => c.id}
        horizontal
        renderItem={({ item: card }) => {
          const selected = selectedCards.some(c => c.id === card.id);
          const isJoker  = card.rank === "JOKER";
          return (
            <TouchableOpacity
              style={[
                styles.card,
                selected  && styles.cardSelected,
                isJoker   && styles.jokerBorder,
              ]}
              onPress={() => toggleCard(card)}
            >
              <Text style={[styles.cardRank, isJoker && styles.jokerText]}>
                {isJoker ? "★" : card.rank}
              </Text>
              <Text style={styles.cardSuit}>{isJoker ? "JOKER" : card.suit[0]?.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.hand}
      />

      {/* Action buttons */}
      {isMyTurn && !actionBusy && isConnected && (
        <View style={styles.actions}>
          {/* LAY MELD — only shown when 3+ cards selected */}
          {selectedCards.length >= 3 && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.meldBtn,
                (selectedPoints >= 41 || selectedMeldCount >= 3) && styles.meldBtnReady,
              ]}
              onPress={handleLayMeld}
            >
              <Text style={styles.actionText}>{layMeldLabel}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDraw}>
              <Text style={styles.actionText}>Draw</Text>
            </TouchableOpacity>

            {/* Discard — visually locked (grey + 🔒) when rules say no */}
            <TouchableOpacity
              style={[styles.actionBtn, discardLocked && styles.actionLocked]}
              onPress={handleDiscard}
            >
              <Text style={styles.actionText}>
                {discardLocked ? "🔒 Discard" : "Discard"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {actionBusy && <ActivityIndicator color="#e94560" style={{ marginTop: 8 }} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Emoji picker modal */}
      <Modal visible={showEmoji} transparent animationType="fade" onRequestClose={() => setShowEmoji(false)}>
        <TouchableOpacity style={styles.emojiBackdrop} onPress={() => setShowEmoji(false)}>
          <View style={styles.emojiPicker}>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity key={e} style={styles.emojiOption} onPress={() => handleEmoji(e)}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#1a1a2e", padding: 10 },
  reconnectBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#444", padding: 6, borderRadius: 8, marginBottom: 6, gap: 6 },
  reconnectText:   { color: "#fff", fontSize: 12 },
  soloBadge:       { backgroundColor: "#2a1f3d", borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "center", marginBottom: 6 },
  soloBadgeText:   { color: "#C4A0FF", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  waitingText:     { color: "#fff", fontSize: 20, textAlign: "center", marginTop: 80 },
  opponentsRow:    { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  opponentSlot:    { backgroundColor: "#16213e", padding: 8, borderRadius: 10, alignItems: "center", minWidth: 75 },
  activeSlot:      { borderColor: "#e94560", borderWidth: 2 },
  opponentAvatar:  { fontSize: 18, marginBottom: 2 },
  opponentName:    { color: "#fff", fontSize: 11, fontWeight: "600", maxWidth: 70 },
  opponentPos:     { color: "#555", fontSize: 9 },
  opponentCards:   { color: "#a0a0c0", fontSize: 11 },
  emojiTrigger:    { fontSize: 16, marginTop: 4 },
  meldZone:        { marginBottom: 8 },
  sectionLabel:    { color: "#a0a0c0", fontSize: 10, marginBottom: 4 },
  meldGroup:       { backgroundColor: "#16213e", borderRadius: 8, padding: 6, marginRight: 8, borderWidth: 1, borderColor: "#333" },
  meldOwner:       { color: "#a0a0c0", fontSize: 9, marginBottom: 2 },
  meldCards:       { flexDirection: "row", gap: 3 },
  meldCard:        { color: "#fff", fontSize: 12, fontWeight: "600" },
  jokerCard:       { color: "#ffd700" },
  stealHint:       { color: "#555", fontSize: 8, marginTop: 2 },
  pileRow:         { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 8 },
  pile:            { backgroundColor: "#16213e", padding: 10, borderRadius: 10, alignItems: "center", minWidth: 58 },
  faceUpPile:      { borderColor: "#444", borderWidth: 1 },
  faceUpEligible:  { borderColor: "#ffd700", borderWidth: 2 },
  pileIcon:        { fontSize: 26 },
  pileCount:       { color: "#a0a0c0", fontSize: 11 },
  pileLabel:       { color: "#a0a0c0", fontSize: 10 },
  pileCard:        { color: "#fff", fontSize: 18, fontWeight: "bold" },
  pileEmpty:       { color: "#555", fontSize: 18 },
  timerRow:        { height: 6, backgroundColor: "#333", borderRadius: 3, marginBottom: 6, overflow: "hidden" },
  timerBar:        { height: 6, backgroundColor: "#e94560", borderRadius: 3 },
  timerText:       { color: "#fff", fontSize: 10, textAlign: "right", marginTop: 1 },
  hintBar:         { backgroundColor: "#16213e", padding: 7, borderRadius: 8, marginBottom: 7, borderWidth: 1, borderColor: "#333" },
  hintBarError:    { borderColor: "#e94560" },
  hintText:        { color: "#a0a0c0", fontSize: 12, textAlign: "center" },
  handLabel:       { color: "#a0a0c0", fontSize: 11, marginBottom: 3 },
  hand:            { paddingBottom: 4 },
  card:            { width: 56, height: 84, backgroundColor: "#16213e", borderRadius: 9, margin: 3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#333" },
  cardSelected:    { borderColor: "#e94560", transform: [{ translateY: -8 }] },
  jokerBorder:     { borderColor: "#ffd700", borderWidth: 2 },
  cardRank:        { color: "#fff", fontSize: 18, fontWeight: "bold" },
  jokerText:       { color: "#ffd700" },
  cardSuit:        { color: "#a0a0c0", fontSize: 9 },
  actions:         { marginTop: 6 },
  actionRow:       { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 4 },
  actionBtn:       { backgroundColor: "#e94560", paddingVertical: 11, paddingHorizontal: 22, borderRadius: 10 },
  actionLocked:    { backgroundColor: "#444" },
  meldBtn:         { backgroundColor: "#0f3460", padding: 11, borderRadius: 10, alignItems: "center", marginBottom: 4 },
  meldBtnReady:    { backgroundColor: "#1a6b3c" },
  actionText:      { color: "#fff", fontSize: 14, fontWeight: "600" },
  overlay:         { flex: 1, alignItems: "center", justifyContent: "center" },
  overlayTitle:    { color: "#fff", fontSize: 32, fontWeight: "bold", marginBottom: 8 },
  overlayWinner:   { color: "#e94560", fontSize: 22, marginBottom: 8 },
  overlayBonus:    { color: "#ffd700", fontSize: 16, marginBottom: 16 },
  payouts:         { marginBottom: 24, alignItems: "center" },
  payoutRow:       { fontSize: 16, marginBottom: 4 },
  payoutPos:       { color: "#4caf50" },
  payoutNeg:       { color: "#e94560" },
  button:          { backgroundColor: "#e94560", padding: 14, borderRadius: 10, alignItems: "center", minWidth: 180, marginBottom: 10 },
  buttonText:      { color: "#fff", fontSize: 16, fontWeight: "600" },
  leaveButton:     { padding: 14, alignItems: "center" },
  leaveText:       { color: "#666", fontSize: 14 },
  error:           { color: "#ff6b6b", fontSize: 12, textAlign: "center", marginTop: 4 },
  emojiBackdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "flex-end", paddingBottom: 100 },
  emojiPicker:     { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#16213e", borderRadius: 16, padding: 12, gap: 8, maxWidth: 280 },
  emojiOption:     { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  emojiText:       { fontSize: 30 },
});

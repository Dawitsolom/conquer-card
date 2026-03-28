/**
 * app/game/[roomId].tsx — Complete table screen
 * All 7 zones: top bar, opponent arc, meld zone, center piles,
 * hint bar, action buttons, 13-card hand fan.
 * Plus: turn timer, emoji reactions, round-over overlay, face-up claim dialog.
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, Modal, Animated, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#FDF3E3',
  brown:       '#3D1C02',
  terracotta:  '#C1440E',
  gold:        '#D4A017',
  cardBg:      '#FFFFFF',
  cardBorder:  '#E8D5B7',
  muted:       '#8B6245',
  felt:        '#C8A96E',
  handBg:      '#3D1C02',
  btnDraw:     '#1a6b3a',
  btnDisabled: '#6B4F35',
  hintBg:      '#F5E6CC',
  overlay:     'rgba(15,10,5,0.82)',
  timerGreen:  '#2d7a4f',
  timerYellow: '#C8930A',
  timerRed:    '#C1440E',
};

// ── Placeholder data ──────────────────────────────────────────────────────────
const MY_HAND = ['A♠','K♥','Q♦','J♣','10♠','9♥','8♦','7♣','6♠','5♥','4♦','3♣','🃏'];

const OPPONENTS = [
  { id:'alex',   initials:'AB', name:'Alex',   active:true,  handCount:12, melds:[['7♠','8♠','9♠','10♠']], disconnected:false },
  { id:'sam',    initials:'CD', name:'Sam',    active:false, handCount:13, melds:[], disconnected:false },
  { id:'jordan', initials:'EF', name:'Jordan', active:false, handCount:11, melds:[['K♥','K♦','K♣']], disconnected:true },
];

const EMOJIS = ['👏','😂','😤','🔥','😱','🤔','💀','❤️'];

const FACE_UP_CARD = 'K♥';
const DISCARD_TOP  = '7♠';

// ── Helpers ───────────────────────────────────────────────────────────────────
function isRed(card: string)   { return card.includes('♥') || card.includes('♦'); }
function isJoker(card: string) { return card === '🃏'; }

function cardPoints(card: string): number {
  if (isJoker(card)) return 0;
  const face = card.replace(/[♠♥♦♣]/g, '');
  if (['J','Q','K'].includes(face)) return 10;
  if (face === 'A') return 11;
  return parseInt(face) || 0;
}

function selectedPoints(hand: string[], selected: Set<number>): number {
  return Array.from(selected).reduce((sum, i) => sum + cardPoints(hand[i]), 0);
}

function getHint(
  hasDrawn: boolean,
  selected: Set<number>,
  hand: string[],
  myMelds: string[][],
): string {
  if (!hasDrawn) return 'Tap the deck to draw a card';
  const selCards = Array.from(selected).map(i => hand[i]);
  if (selCards.length === 1 && isJoker(selCards[0]))
    return 'Jokers cannot be discarded — use it in a meld or save it to finish';
  if (selected.size >= 3) {
    const pts = selectedPoints(hand, selected);
    if (myMelds.length === 0 && pts < 41)
      return `You need 41+ points or 3 melds to open (${pts}pts selected)`;
    return `Lay your meld (${pts}pts) or tap Discard`;
  }
  if (myMelds.length > 0 && selected.size === 1)
    return 'Add cards to melds or discard';
  if (myMelds.length === 0 && selected.size > 0)
    return 'You need 41+ points or 3 melds to open';
  if (hand.length === 1 && hasDrawn)
    return 'Discard your final card to win!';
  return 'Select cards to meld or tap Discard';
}

// ── TurnTimer ─────────────────────────────────────────────────────────────────
function TurnTimer({ seconds }: { seconds: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const anim  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (seconds <= 5) {
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.22, duration: 350, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 350, useNativeDriver: true }),
        ])
      );
      anim.current.start();
    } else {
      anim.current?.stop();
      pulse.setValue(1);
    }
    return () => anim.current?.stop();
  }, [seconds <= 5]);

  const color = seconds > 15 ? C.timerGreen : seconds > 5 ? C.timerYellow : C.timerRed;
  return (
    <Animated.View style={[tt.ring, { borderColor: color, transform: [{ scale: pulse }] }]}>
      <Text style={[tt.num, { color }]}>{seconds}</Text>
    </Animated.View>
  );
}
const tt = StyleSheet.create({
  ring: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  num:  { fontSize: 13, fontWeight: '900' },
});

// ── OpponentSlot ──────────────────────────────────────────────────────────────
function OpponentSlot({ op, showTimer }: { op: typeof OPPONENTS[0]; showTimer: boolean }) {
  return (
    <View style={os.wrap}>
      <View style={[os.ring, op.active && os.ringActive]}>
        <View style={[os.avatar, op.disconnected && os.avatarDisc]}>
          <Text style={os.initials}>{op.initials}</Text>
        </View>
      </View>
      <Text style={[os.name, op.disconnected && os.nameDisc]} numberOfLines={1}>
        {op.disconnected ? '⚡ reconnecting' : op.name}
      </Text>
      {/* Card-back fan */}
      <View style={os.cardFan}>
        {[0, 1, 2].map(j => (
          <View
            key={j}
            style={[
              os.cardBack,
              { transform: [{ rotate: `${(j - 1) * 7}deg` }, { translateY: Math.abs(j - 1) * 2 }], zIndex: j },
            ]}
          />
        ))}
      </View>
      <Text style={os.count}>{op.handCount} cards</Text>
      {showTimer && <TurnTimer seconds={22} />}
    </View>
  );
}
const os = StyleSheet.create({
  wrap:       { alignItems: 'center', width: 80 },
  ring:       { borderRadius: 28, padding: 3, borderWidth: 2.5, borderColor: 'transparent', marginBottom: 3 },
  ringActive: { borderColor: C.terracotta, shadowColor: C.terracotta, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 7, elevation: 6 },
  avatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: C.brown, alignItems: 'center', justifyContent: 'center' },
  avatarDisc: { backgroundColor: '#888' },
  initials:   { color: '#FDF3E3', fontSize: 15, fontWeight: '800' },
  name:       { color: C.brown, fontSize: 10, fontWeight: '600', maxWidth: 78, textAlign: 'center' },
  nameDisc:   { color: '#999', fontSize: 9 },
  cardFan:    { flexDirection: 'row', height: 28, alignItems: 'flex-end', justifyContent: 'center', marginTop: 4 },
  cardBack:   { width: 18, height: 26, borderRadius: 3, backgroundColor: C.brown, borderWidth: 1, borderColor: '#5a2e0a', marginHorizontal: -4 },
  count:      { fontSize: 9, color: C.muted, fontWeight: '600', marginTop: 2 },
});

// ── MeldGroup ─────────────────────────────────────────────────────────────────
function MeldGroup({ label, melds, onAddToMeld }: {
  label: string; melds: string[][]; onAddToMeld?: (meldIdx: number) => void;
}) {
  if (melds.length === 0) return null;
  return (
    <View style={mg.group}>
      <Text style={mg.owner}>{label}</Text>
      {melds.map((meld, mi) => (
        <TouchableOpacity
          key={mi} style={mg.meldRow}
          onPress={() => onAddToMeld?.(mi)}
          activeOpacity={onAddToMeld ? 0.75 : 1}
        >
          {meld.map((c, ci) => (
            <View key={ci} style={[mg.card, isJoker(c) && mg.jokerCard]}>
              <Text style={[mg.cardTxt, isRed(c) && mg.red, isJoker(c) && mg.jokerTxt]}>{c}</Text>
            </View>
          ))}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const mg = StyleSheet.create({
  group:    { marginRight: 16 },
  owner:    { fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 4 },
  meldRow:  { flexDirection: 'row', gap: 2, marginBottom: 3 },
  card:     { width: 34, height: 48, borderRadius: 5, backgroundColor: C.cardBg, borderWidth: 1.5, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  jokerCard:{ borderColor: C.gold, borderWidth: 2 },
  cardTxt:  { fontSize: 10, fontWeight: '800', color: C.brown },
  red:      { color: C.terracotta },
  jokerTxt: { fontSize: 14 },
});

// ── EmojiFloat ────────────────────────────────────────────────────────────────
function EmojiFloat({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const y  = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y,  { toValue: -90, duration: 1500, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(onDone);
  }, []);
  return (
    <Animated.Text style={[ef.emoji, { transform: [{ translateY: y }], opacity: op }]}>
      {emoji}
    </Animated.Text>
  );
}
const ef = StyleSheet.create({
  emoji: { position: 'absolute', bottom: 200, left: '44%', fontSize: 36, zIndex: 99 },
});

// ── FaceUpClaimDialog ─────────────────────────────────────────────────────────
function FaceUpClaimDialog({ visible, card, onConfirm, onCancel }: {
  visible: boolean; card: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={fcd.backdrop}>
        <View style={fcd.panel}>
          <Text style={fcd.title}>Claim Face-Up Card?</Text>
          <View style={[fcd.bigCard, isRed(card) && fcd.bigCardRed]}>
            <Text style={[fcd.bigCardTxt, isRed(card) && fcd.red]}>{card}</Text>
          </View>
          <Text style={fcd.note}>
            You can only claim to finish the round.{'\n'}
            You must have zero melds on the table.
          </Text>
          <View style={fcd.btnRow}>
            <TouchableOpacity style={fcd.confirmBtn} onPress={onConfirm}>
              <Text style={fcd.confirmTxt}>Claim & Finish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fcd.cancelBtn} onPress={onCancel}>
              <Text style={fcd.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const fcd = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  panel:      { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, alignItems: 'center' },
  title:      { fontSize: 20, fontWeight: '900', color: C.brown, marginBottom: 16 },
  bigCard:    { width: 72, height: 100, borderRadius: 10, backgroundColor: C.cardBg, borderWidth: 3, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bigCardRed: { borderColor: C.terracotta },
  bigCardTxt: { fontSize: 22, fontWeight: '900', color: C.brown },
  red:        { color: C.terracotta },
  note:       { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btnRow:     { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmTxt: { color: C.brown, fontSize: 15, fontWeight: '900' },
  cancelBtn:  { flex: 1, borderWidth: 2, borderColor: C.cardBorder, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt:  { color: C.muted, fontSize: 15, fontWeight: '700' },
});

// ── RoundOverOverlay ──────────────────────────────────────────────────────────
type RoundResult = 'win' | 'lose' | 'double' | 'perfect';

function RoundOverOverlay({ visible, result, onNext, onLeave }: {
  visible: boolean; result: RoundResult; onNext: () => void; onLeave: () => void;
}) {
  const config: Record<RoundResult, { title: string; subtitle: string }> = {
    win:     { title: '🏆 YOU WIN!',       subtitle: '+🪙 30' },
    lose:    { title: 'ALEX WINS',         subtitle: '–🪙 10' },
    double:  { title: '⚡ JOKER FINISH!',  subtitle: 'Double coins!  +🪙 60' },
    perfect: { title: '✨ PERFECT HAND!',  subtitle: 'Double coins!  +🪙 60' },
  };
  const isGold = result === 'double' || result === 'perfect';
  const payouts = [
    { name: 'Alex',   coins: '+🪙 30', win: result !== 'lose' },
    { name: 'You',    coins: result === 'lose' ? '–🪙 10' : '+🪙 30', win: result !== 'lose' },
    { name: 'Sam',    coins: '–🪙 10', win: false },
    { name: 'Jordan', coins: '–🪙 10', win: false },
  ];

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={rov.backdrop}>
        <View style={[rov.panel, isGold && rov.goldPanel]}>
          <Text style={rov.title}>{config[result].title}</Text>
          <Text style={rov.subtitle}>{config[result].subtitle}</Text>
          <View style={rov.payouts}>
            {payouts.map(p => (
              <View key={p.name} style={rov.payRow}>
                <Text style={rov.payName}>{p.name}</Text>
                <Text style={[rov.payCoins, p.win && rov.green]}>{p.coins}</Text>
              </View>
            ))}
          </View>
          <View style={rov.btnRow}>
            <TouchableOpacity style={rov.btnNext} onPress={onNext}>
              <Text style={rov.btnNextTxt}>Next Round</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rov.btnLeave} onPress={onLeave}>
              <Text style={rov.btnLeaveTxt}>Leave Table</Text>
            </TouchableOpacity>
          </View>
          <Text style={rov.countdown}>Next round in 8s</Text>
        </View>
      </View>
    </Modal>
  );
}
const rov = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center' },
  panel:       { backgroundColor: C.bg, borderRadius: 20, padding: 28, width: '86%', alignItems: 'center', borderWidth: 2, borderColor: C.cardBorder },
  goldPanel:   { borderColor: C.gold, shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  title:       { fontSize: 26, fontWeight: '900', color: C.brown, letterSpacing: 1, marginBottom: 6, textAlign: 'center' },
  subtitle:    { fontSize: 17, fontWeight: '800', color: C.terracotta, marginBottom: 18 },
  payouts:     { width: '100%', gap: 8, marginBottom: 22 },
  payRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  payName:     { fontSize: 15, color: C.brown, fontWeight: '600' },
  payCoins:    { fontSize: 15, color: C.muted, fontWeight: '700' },
  green:       { color: '#1a6b3a' },
  btnRow:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  btnNext:     { backgroundColor: C.terracotta, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24 },
  btnNextTxt:  { color: '#FFF', fontSize: 15, fontWeight: '800' },
  btnLeave:    { borderWidth: 2, borderColor: C.brown, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20 },
  btnLeaveTxt: { color: C.brown, fontSize: 15, fontWeight: '700' },
  countdown:   { fontSize: 12, color: C.muted, fontWeight: '600' },
});

// ── GameScreen ────────────────────────────────────────────────────────────────
export default function GameScreen() {
  const { roomId }  = useLocalSearchParams<{ roomId: string }>();
  const router      = useRouter();
  const { width }   = useWindowDimensions();

  const [hand, setHand]               = useState(MY_HAND);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [hasDrawn, setHasDrawn]       = useState(false);
  const [myMelds, setMyMelds]         = useState<string[][]>([]);
  const [showRoundOver, setShowRoundOver] = useState(false);
  const [roundResult, setRoundResult]     = useState<RoundResult>('lose');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingEmoji, setFloatingEmoji]     = useState<string | null>(null);
  const [showFaceUpClaim, setShowFaceUpClaim] = useState(false);

  // ── Card sizing: 13 cards fan across screen width ─────────────────────────
  const OVERLAP = 0.38;
  const cardW = Math.min(50, (width - 32) / (hand.length * (1 - OVERLAP) + OVERLAP));
  const cardH = cardW * 1.55;

  function toggleCard(i: number) {
    setSelectedIdx(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleDraw() {
    if (!hasDrawn) setHasDrawn(true);
  }

  function handleLayMeld() {
    if (selectedIdx.size < 3) return;
    const sorted = Array.from(selectedIdx).sort((a, b) => a - b);
    const meld   = sorted.map(i => hand[i]);
    setMyMelds(prev => [...prev, meld]);
    setHand(prev => prev.filter((_, i) => !selectedIdx.has(i)));
    setSelectedIdx(new Set());
  }

  function handleDiscard() {
    if (!hasDrawn || selectedIdx.size !== 1) return;
    const [idx] = Array.from(selectedIdx);
    if (isJoker(hand[idx])) return;
    setHand(prev => prev.filter((_, i) => i !== idx));
    setSelectedIdx(new Set());
    setHasDrawn(false);
    // Dev shortcut: trigger round-over after every discard
    setRoundResult('lose');
    setShowRoundOver(true);
  }

  function sendEmoji(e: string) {
    setShowEmojiPicker(false);
    setFloatingEmoji(e);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const selPts       = selectedPoints(hand, selectedIdx);
  const firstSelCard = selectedIdx.size === 1 ? hand[Array.from(selectedIdx)[0]!] : '';
  const jokerSelected = selectedIdx.size === 1 && isJoker(firstSelCard);
  const canLayMeld   = hasDrawn && selectedIdx.size >= 3;
  const canDiscard   = hasDrawn && selectedIdx.size === 1 && !jokerSelected;
  const hintMsg      = getHint(hasDrawn, selectedIdx, hand, myMelds);

  // Opening progress (only matters before player has opened)
  const openingPts = myMelds.length === 0 ? selPts : 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brown} />

      {/* ── Zone 1: Top bar ────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Leave</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.roundTxt}>Round 1  ·  🪙10</Text>
          {myMelds.length === 0 && selectedIdx.size > 0 && (
            <Text style={s.openingPts}>{openingPts}/41 pts to open</Text>
          )}
        </View>
        <View style={s.topRight}>
          <TouchableOpacity onPress={() => setShowEmojiPicker(v => !v)} style={s.iconBtn}>
            <Text style={s.iconTxt}>😊</Text>
          </TouchableOpacity>
          {/* Dev: cycle round-over variants */}
          <TouchableOpacity
            onPress={() => {
              const variants: RoundResult[] = ['win','lose','double','perfect'];
              setRoundResult(v => variants[(variants.indexOf(v) + 1) % variants.length]);
              setShowRoundOver(true);
            }}
            style={s.iconBtn}
          >
            <Text style={s.iconTxt}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Emoji picker strip ─────────────────────────────────────────────── */}
      {showEmojiPicker && (
        <View style={s.emojiPicker}>
          {EMOJIS.map(e => (
            <TouchableOpacity key={e} style={s.emojiOpt} onPress={() => sendEmoji(e)}>
              <Text style={s.emojiOptTxt}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Zone 2+3+4: Felt (opponents, melds, center piles) ─────────────── */}
      <View style={s.felt}>

        {/* Zone 2: Opponent arc */}
        <View style={s.opponentRow}>
          {OPPONENTS.map(op => (
            <OpponentSlot key={op.id} op={op} showTimer={op.active} />
          ))}
        </View>

        {/* Zone 3: Meld zone — horizontally scrollable */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.meldScroll} contentContainerStyle={s.meldContent}
        >
          {OPPONENTS.map(op => (
            <MeldGroup key={op.id} label={op.name} melds={op.melds} />
          ))}
          {myMelds.length > 0 && (
            <MeldGroup label="You" melds={myMelds} onAddToMeld={() => {}} />
          )}
        </ScrollView>

        {/* Zone 4: Center — face-up, deck, discard */}
        <View style={s.centerRow}>

          {/* Face-Up card (gold border, 3° tilt) */}
          <View style={s.pileCol}>
            <Text style={s.faceUpLbl}>FACE-UP</Text>
            <TouchableOpacity
              style={[s.pileCard, s.faceUpCard, { transform: [{ rotate: '3deg' }] }]}
              onPress={() => setShowFaceUpClaim(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.pileCardTxt, isRed(FACE_UP_CARD) && s.redTxt]}>
                {FACE_UP_CARD}
              </Text>
            </TouchableOpacity>
            <Text style={s.faceUpHint}>tap to claim</Text>
          </View>

          {/* Draw deck */}
          <View style={s.pileCol}>
            <Text style={s.pileLbl}>DECK</Text>
            <TouchableOpacity
              style={[s.pileCard, s.deckCard, hasDrawn && s.deckUsed]}
              onPress={handleDraw}
              activeOpacity={hasDrawn ? 1 : 0.75}
            >
              <Text style={s.deckLbl}>DRAW</Text>
              <Text style={s.deckCount}>54</Text>
            </TouchableOpacity>
          </View>

          {/* Discard pile */}
          <View style={s.pileCol}>
            <Text style={s.pileLbl}>DISCARD</Text>
            <TouchableOpacity
              style={[s.pileCard, s.discardCard]}
              onPress={() => { if (!hasDrawn) setHasDrawn(true); }}
              activeOpacity={0.75}
            >
              <Text style={[s.pileCardTxt, isRed(DISCARD_TOP) && s.redTxt]}>
                {DISCARD_TOP}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* ── Zone 5: Hint bar ───────────────────────────────────────────────── */}
      <View style={[s.hintBar, jokerSelected && s.hintBarWarn]}>
        <Text style={[s.hintTxt, jokerSelected && s.hintTxtWarn]} numberOfLines={2} adjustsFontSizeToFit>
          {jokerSelected
            ? 'Jokers cannot be discarded — use it in a meld or save it to finish'
            : hintMsg}
        </Text>
      </View>

      {/* ── Zone 7: Action buttons ─────────────────────────────────────────── */}
      <View style={s.actionRow}>

        {/* Draw */}
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: hasDrawn ? C.btnDisabled : C.btnDraw }]}
          onPress={handleDraw}
          activeOpacity={hasDrawn ? 1 : 0.8}
        >
          <Text style={s.actionBtnTxt}>Draw</Text>
        </TouchableOpacity>

        {/* Lay Meld */}
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: canLayMeld ? C.brown : C.btnDisabled }]}
          onPress={handleLayMeld}
          activeOpacity={canLayMeld ? 0.8 : 1}
        >
          <Text style={s.actionBtnTxt} numberOfLines={1}>
            {canLayMeld ? `Meld (${selPts}pts)` : 'Lay Meld'}
          </Text>
        </TouchableOpacity>

        {/* Discard */}
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: canDiscard ? C.terracotta : C.btnDisabled }]}
          onPress={handleDiscard}
          activeOpacity={canDiscard ? 0.8 : 1}
        >
          <Text style={s.actionBtnTxt}>
            {jokerSelected ? '🚫 Discard' : 'Discard'}
          </Text>
        </TouchableOpacity>

      </View>

      {/* ── Zone 6: Hand tray ─────────────────────────────────────────────── */}
      <View style={s.handTray}>
        <Text style={s.handLabel}>YOUR HAND  ·  {hand.length} cards</Text>
        <View style={[s.fanRow, { height: cardH + 32 }]}>
          {hand.map((card, i) => {
            const total  = hand.length;
            const spread = 22;
            const angle  = total > 1 ? -spread / 2 + (spread / (total - 1)) * i : 0;
            const lift   = Math.abs(angle) * 1.0;
            const sel    = selectedIdx.has(i);
            return (
              <TouchableOpacity
                key={`${card}-${i}`}
                activeOpacity={0.85}
                onPress={() => toggleCard(i)}
                style={[
                  s.handCard,
                  {
                    width:  cardW,
                    height: cardH,
                    marginHorizontal: -(cardW * OVERLAP),
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: sel ? lift - 16 : lift },
                    ],
                    borderColor: sel
                      ? C.terracotta
                      : isJoker(card)
                        ? C.gold
                        : C.cardBorder,
                    borderWidth: sel ? 2.5 : isJoker(card) ? 2 : 1.5,
                    zIndex: sel ? 100 + i : i,
                  },
                ]}
              >
                <Text
                  style={[
                    s.handCardTxt,
                    isRed(card)   && s.redTxt,
                    isJoker(card) && s.jokerTxt,
                  ]}
                >
                  {card}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Floating emoji reaction */}
      {floatingEmoji && (
        <EmojiFloat emoji={floatingEmoji} onDone={() => setFloatingEmoji(null)} />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <FaceUpClaimDialog
        visible={showFaceUpClaim}
        card={FACE_UP_CARD}
        onConfirm={() => setShowFaceUpClaim(false)}
        onCancel={() => setShowFaceUpClaim(false)}
      />
      <RoundOverOverlay
        visible={showRoundOver}
        result={roundResult}
        onNext={() => setShowRoundOver(false)}
        onLeave={() => { setShowRoundOver(false); router.replace('/'); }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Top bar
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.brown, paddingHorizontal: 14, paddingVertical: 11 },
  backBtn:    { width: 58 },
  backTxt:    { color: '#FDF3E3', fontSize: 13, fontWeight: '600' },
  topCenter:  { alignItems: 'center', flex: 1 },
  roundTxt:   { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  openingPts: { color: C.gold, fontSize: 11, fontWeight: '700', marginTop: 2 },
  topRight:   { flexDirection: 'row', gap: 6, width: 58, justifyContent: 'flex-end' },
  iconBtn:    { padding: 4 },
  iconTxt:    { fontSize: 20 },

  // Emoji picker strip
  emojiPicker:  { flexDirection: 'row', backgroundColor: C.brown, paddingVertical: 8, paddingHorizontal: 10, justifyContent: 'space-around' },
  emojiOpt:     { padding: 6 },
  emojiOptTxt:  { fontSize: 24 },

  // Felt
  felt: { flex: 1, backgroundColor: C.felt, paddingTop: 8, paddingHorizontal: 10 },

  // Zone 2: opponent row
  opponentRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },

  // Zone 3: meld zone
  meldScroll:  { maxHeight: 76, marginBottom: 6 },
  meldContent: { paddingHorizontal: 2, alignItems: 'flex-start' },

  // Zone 4: center piles
  centerRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 20, flex: 1, paddingBottom: 10 },
  pileCol:     { alignItems: 'center', gap: 4 },
  pileLbl:     { fontSize: 8, fontWeight: '700', color: C.muted, letterSpacing: 1.5 },
  faceUpLbl:   { fontSize: 8, fontWeight: '700', color: C.gold, letterSpacing: 1.5 },
  faceUpHint:  { fontSize: 8, color: C.gold, fontWeight: '600' },
  pileCard:    { width: 54, height: 78, borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  pileCardTxt: { fontSize: 16, fontWeight: '900', color: C.brown },
  redTxt:      { color: C.terracotta },
  faceUpCard:  { backgroundColor: C.cardBg, borderWidth: 3, borderColor: C.gold },
  deckCard:    { backgroundColor: C.brown, borderWidth: 2, borderColor: '#5a2e0a' },
  deckUsed:    { opacity: 0.45 },
  deckLbl:     { fontSize: 7, fontWeight: '800', color: '#FDF3E3', letterSpacing: 1.5, marginBottom: 2 },
  deckCount:   { fontSize: 17, fontWeight: '900', color: C.gold },
  discardCard: { backgroundColor: C.cardBg, borderWidth: 1.5, borderColor: C.cardBorder },

  // Zone 5: hint bar
  hintBar:     { backgroundColor: C.hintBg, paddingVertical: 7, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.cardBorder, alignItems: 'center', minHeight: 34 },
  hintBarWarn: { backgroundColor: '#fff3b0' },
  hintTxt:     { fontSize: 12, color: C.muted, fontWeight: '600', textAlign: 'center' },
  hintTxtWarn: { color: '#7a5900' },

  // Zone 7: action buttons
  actionRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.handBg },
  actionBtn:    { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  // Zone 6: hand tray
  handTray:    { backgroundColor: C.handBg, paddingBottom: 8, alignItems: 'center' },
  handLabel:   { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  fanRow:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 8 },
  handCard:    { backgroundColor: C.cardBg, borderRadius: 7, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 3 },
  handCardTxt: { fontSize: 11, fontWeight: '800', color: C.brown },
  jokerTxt:    { fontSize: 18 },
});

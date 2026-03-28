import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#FDF3E3', // Warm Cream
  brown:      '#3D1C02', // Deep Brown
  terracotta: '#C1440E', // Accent / CTA
  gold:       '#D4A017', // Coins
  cardBg:     '#FFFFFF',
  cardBorder: '#E8D5B7',
  muted:      '#8B6245',
  tabBg:      '#3D1C02',
  tabActive:  '#C1440E',
  tabMuted:   '#A08060',
};

// ── Table tiers ───────────────────────────────────────────────────────────────
const TIERS = [
  { emoji: '🌱', label: 'Beginner',    cost: 10  },
  { emoji: '⚔️',  label: 'Standard',   cost: 50  },
  { emoji: '🔥', label: 'High Stakes', cost: 100 },
  { emoji: '👑', label: 'Elite',       cost: 500 },
];

export default function HomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>CONQUER{'\n'}CARD</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinAmt}>200</Text>
        </View>
      </View>

      {/* ── Table list ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>JOIN A TABLE</Text>

        {TIERS.map((tier) => (
          <TouchableOpacity
            key={tier.label}
            style={styles.tierCard}
            activeOpacity={0.75}
            onPress={() => router.push('/game/demo-room')}
          >
            <View style={styles.tierLeft}>
              <Text style={styles.tierEmoji}>{tier.emoji}</Text>
              <View>
                <Text style={styles.tierName}>{tier.label}</Text>
                <Text style={styles.tierSub}>2–4 players</Text>
              </View>
            </View>
            <View style={styles.tierRight}>
              <Text style={styles.tierCost}>🪙 {tier.cost}</Text>
              <Text style={styles.tierJoin}>JOIN →</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── Create Private Table ─────────────────────────────────────────── */}
        <TouchableOpacity style={styles.privateBtn} activeOpacity={0.85}>
          <Text style={styles.privateBtnText}>+ Create Private Table</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Bottom tab bar ──────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, { color: C.tabActive }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/profile')}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/shop')}>
          <Text style={styles.tabIcon}>🛒</Text>
          <Text style={styles.tabLabel}>Shop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: C.brown,
    letterSpacing: 2,
    lineHeight: 33,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  coinIcon: { fontSize: 15 },
  coinAmt:  { fontSize: 15, fontWeight: '700', color: C.brown },

  // Scroll
  scroll:      { flex: 1 },
  scrollInner: { paddingHorizontal: 16, paddingTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Tier cards
  tierCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  tierLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierEmoji: { fontSize: 28 },
  tierName:  { fontSize: 17, fontWeight: '700', color: C.brown },
  tierSub:   { fontSize: 12, color: C.muted, marginTop: 2 },
  tierRight: { alignItems: 'flex-end', gap: 4 },
  tierCost:  { fontSize: 15, fontWeight: '700', color: C.brown },
  tierJoin:  { fontSize: 12, fontWeight: '700', color: C.terracotta, letterSpacing: 1 },

  // Private table button
  privateBtn: {
    backgroundColor: C.terracotta,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  privateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.tabBg,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabItem:  { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:  { fontSize: 20 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.tabMuted },
});

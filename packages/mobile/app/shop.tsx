import {
  View, Text, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const C = {
  bg:         '#FDF3E3',
  brown:      '#3D1C02',
  terracotta: '#C1440E',
  gold:       '#D4A017',
  muted:      '#8B6245',
  cardBg:     '#FFFFFF',
  cardBorder: '#E8D5B7',
  badgeBg:    '#1a6b3a',
};

const COIN_PACKS = [
  { coins: '500',    price: '$0.99', badge: null,         icon: '🪙' },
  { coins: '1,500',  price: '$2.99', badge: 'BEST VALUE', icon: '💰' },
  { coins: '4,000',  price: '$4.99', badge: null,         icon: '💰' },
  { coins: '10,000', price: '$9.99', badge: null,         icon: '💎' },
];

export default function ShopScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brown} />

      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.header}>SHOP</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Supporter Pack */}
        <View style={s.supportCard}>
          <View style={s.supportLeft}>
            <Text style={s.supportIcon}>❤️</Text>
            <View>
              <Text style={s.supportTitle}>Supporter Pack</Text>
              <Text style={s.supportSub}>Support the developer</Text>
            </View>
          </View>
          <TouchableOpacity style={s.supportBtn} activeOpacity={0.85}>
            <Text style={s.supportBtnTxt}>$1.99</Text>
          </TouchableOpacity>
        </View>

        {/* Coin packs label */}
        <Text style={s.sectionLabel}>COIN PACKS</Text>

        {/* 2×2 grid */}
        <View style={s.grid}>
          {COIN_PACKS.map((pack) => (
            <View key={pack.coins} style={s.packCard}>
              {/* Best Value badge */}
              {pack.badge && (
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>{pack.badge}</Text>
                </View>
              )}
              <Text style={s.packIcon}>{pack.icon}</Text>
              <Text style={s.packCoins}>{pack.coins}</Text>
              <Text style={s.packLabel}>coins</Text>
              <TouchableOpacity style={s.buyBtn} activeOpacity={0.85}>
                <Text style={s.buyBtnTxt}>BUY {pack.price}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={s.disclaimer}>
          Purchases are processed through the App Store.{'\n'}
          Coins are for in-game wagering only and have no real-world value.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.brown, paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 52 },
  backTxt: { color: '#FDF3E3', fontSize: 14, fontWeight: '600' },
  header:  { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  // Supporter card
  supportCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.cardBg,
    borderWidth: 2.5, borderColor: C.gold,
    borderRadius: 16, padding: 18, marginBottom: 28,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  supportLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  supportIcon:    { fontSize: 30 },
  supportTitle:   { fontSize: 16, fontWeight: '800', color: C.brown },
  supportSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  supportBtn: {
    backgroundColor: C.terracotta, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  supportBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    letterSpacing: 2, marginBottom: 14, marginLeft: 2,
  },

  // 2×2 grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  packCard: {
    width: '47.5%', backgroundColor: C.cardBg,
    borderRadius: 16, borderWidth: 1.5, borderColor: C.cardBorder,
    padding: 18, alignItems: 'center',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  badge: {
    position: 'absolute', top: -1, right: -1,
    backgroundColor: C.badgeBg, borderRadius: 8,
    borderTopRightRadius: 14,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  badgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  packIcon:  { fontSize: 32, marginBottom: 8, marginTop: 8 },
  packCoins: { fontSize: 26, fontWeight: '900', color: C.brown },
  packLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 16 },

  buyBtn: {
    backgroundColor: C.terracotta, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, width: '100%', alignItems: 'center',
  },
  buyBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  disclaimer: {
    fontSize: 11, color: C.muted, textAlign: 'center',
    lineHeight: 16, marginTop: 28, paddingHorizontal: 8,
  },
});

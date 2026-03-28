import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
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
  inputBg:    '#FFF8F0',
};

const STATS = [
  { label: 'Rounds\nPlayed', value: '0' },
  { label: 'Rounds\nWon',    value: '0' },
  { label: 'Double\nWins',   value: '0' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName]       = useState('Dawit A.');
  const [editing, setEditing] = useState(false);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.header}>PROFILE</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarInitials}>DA</Text>
          </View>
        </View>

        {/* Display name — tap to edit */}
        <View style={s.nameRow}>
          {editing ? (
            <TextInput
              style={s.nameInput}
              value={name}
              onChangeText={setName}
              onBlur={() => setEditing(false)}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7}>
              <Text style={s.nameTxt}>{name}</Text>
              <Text style={s.nameEdit}>Tap to edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Coin balance */}
        <View style={s.coinRow}>
          <Text style={s.coinIcon}>🪙</Text>
          <Text style={s.coinAmt}>200</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.label} style={s.statBox}>
              <Text style={s.statVal}>{stat.value}</Text>
              <Text style={s.statLbl}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Match history */}
        <Text style={s.sectionTitle}>MATCH HISTORY</Text>
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>🃏</Text>
          <Text style={s.emptyTxt}>No games yet</Text>
          <Text style={s.emptySub}>Your match results will appear here</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.brown,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 52 },
  backTxt: { color: '#FDF3E3', fontSize: 14, fontWeight: '600' },
  header:  { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  scroll: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20 },

  avatarWrap: { marginBottom: 16 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.brown,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.gold,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  avatarInitials: { color: '#FDF3E3', fontSize: 32, fontWeight: '900' },

  nameRow:  { alignItems: 'center', marginBottom: 20 },
  nameTxt:  { fontSize: 22, fontWeight: '800', color: C.brown, textAlign: 'center' },
  nameEdit: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 3 },
  nameInput: {
    fontSize: 22, fontWeight: '800', color: C.brown,
    borderBottomWidth: 2, borderBottomColor: C.terracotta,
    paddingVertical: 4, paddingHorizontal: 8, minWidth: 160, textAlign: 'center',
  },

  coinRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  coinIcon: { fontSize: 28 },
  coinAmt:  { fontSize: 32, fontWeight: '900', color: C.gold },

  statsRow: {
    flexDirection: 'row', gap: 12,
    width: '100%', marginBottom: 32,
  },
  statBox: {
    flex: 1, backgroundColor: C.cardBg,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.cardBorder,
    padding: 14, alignItems: 'center',
  },
  statVal: { fontSize: 24, fontWeight: '900', color: C.brown },
  statLbl: { fontSize: 10, color: C.muted, fontWeight: '600', textAlign: 'center', marginTop: 4, lineHeight: 14 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    letterSpacing: 2, alignSelf: 'flex-start', marginBottom: 12,
  },
  emptyCard: {
    width: '100%', backgroundColor: C.cardBg,
    borderRadius: 16, borderWidth: 1.5, borderColor: C.cardBorder,
    padding: 32, alignItems: 'center',
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTxt:  { fontSize: 16, fontWeight: '700', color: C.brown, marginBottom: 6 },
  emptySub:  { fontSize: 13, color: C.muted, textAlign: 'center' },
});

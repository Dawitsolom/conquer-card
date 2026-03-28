import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, ScrollView,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Redirect, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { trackEvent } from "../hooks/useAnalytics";
import {
  getPublicTables, getProfile, createTable, createSoloTable, joinTable,
  type TablesByTier, type UserProfile,
} from "../services/apiService";

const TIERS = ["beginner", "standard", "highStakes", "elite"] as const;

const TIER_META: Record<typeof TIERS[number], { emoji: string; label: string; coins: number }> = {
  beginner:   { emoji: "🌱", label: "Beginner",     coins: 10  },
  standard:   { emoji: "⚔️",  label: "Standard",     coins: 50  },
  highStakes: { emoji: "🔥", label: "High Stakes",  coins: 100 },
  elite:      { emoji: "👑", label: "Elite",         coins: 500 },
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [tables,  setTables]  = useState<TablesByTier | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);  // tableId being joined

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([
        getPublicTables(),
        getProfile(user.uid),
      ]);
      setTables(t);
      setProfile(p);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      // Auth errors send back to login
      if (msg.startsWith("401") || msg.startsWith("403")) {
        logout();
        router.replace("/login");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, logout, router]);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [loadData, user]);

  const handleJoin = async (tableId: string) => {
    setJoining(tableId);
    try {
      await joinTable(tableId);
      trackEvent("table_joined", { tableId });
      router.push(`/game/${tableId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async () => {
    try {
      const result = await createTable(50);
      trackEvent("game_created", { tableId: result.tableId });
      router.push(`/game/${result.tableId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create table");
    }
  };

  const handleSolo = async () => {
    try {
      const result = await createSoloTable();
      trackEvent("solo_game_started", { tableId: result.tableId });
      router.push(`/game/${result.tableId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start solo game");
    }
  };

  const handleSignOut = async () => {
    logout();
    if (isFirebaseConfigured && auth) await signOut(auth);
  };

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#C4783A" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>CONQUER CARD</Text>
        <TouchableOpacity style={styles.coinBadge} onPress={handleSignOut}>
          <Text style={styles.coinBadgeText}>
            🪙 {profile?.coinBalance ?? "—"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error && <Text style={styles.error}>{error}</Text>}

        {/* ── Solo Play ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>SOLO PLAY</Text>
        <TouchableOpacity style={styles.soloCard} onPress={handleSolo}>
          <Text style={styles.soloEmoji}>🤖</Text>
          <View style={styles.soloInfo}>
            <Text style={styles.soloTitle}>Play vs Bots</Text>
            <Text style={styles.soloSub}>Practice against AI — no coins wagered</Text>
          </View>
          <View style={styles.soloBtn}>
            <Text style={styles.soloBtnText}>PLAY →</Text>
          </View>
        </TouchableOpacity>

        {/* ── Tier cards ──────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>JOIN A TABLE</Text>

        {TIERS.map(tier => {
          const meta = TIER_META[tier];
          const list = tables?.[tier] ?? [];
          return (
            <View key={tier} style={styles.tierCard}>
              <Text style={styles.tierEmoji}>{meta.emoji}</Text>
              <View style={styles.tierInfo}>
                <Text style={styles.tierName}>{meta.label}</Text>
                <Text style={styles.tierSub}>2–4 players</Text>
              </View>
              <Text style={styles.tierCoins}>{meta.coins} coins</Text>
              {list.length > 0 ? (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => handleJoin(list[0]!.id)}
                  disabled={joining === list[0]!.id}
                >
                  {joining === list[0]!.id
                    ? <ActivityIndicator color="#C4783A" size="small" />
                    : <Text style={styles.joinBtnText}>JOIN →</Text>
                  }
                </TouchableOpacity>
              ) : (
                <Text style={styles.noTables}>Empty</Text>
              )}
            </View>
          );
        })}

        {/* ── Create private table ────────────────────────────────────── */}
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Text style={styles.createBtnText}>+ Create Private Table</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bottom tab bar ──────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, styles.tabActive]}>Home</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabLabel}>Profile</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>🛒</Text>
          <Text style={styles.tabLabel}>Shop</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const C = {
  cream:      "#FDF3E3",
  border:     "#E8D5B7",
  brown:      "#3B1F0E",
  terra:      "#C4783A",
  amberPill:  "#F5A623",
  white:      "#FFFFFF",
  subtext:    "#9B7E5E",
  tabBar:     "#2C1A0E",
};

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.cream },
  loadingContainer:{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" },

  // Header
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                     paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:           { fontSize: 22, fontWeight: "900", letterSpacing: 2, color: C.brown },
  coinBadge:       { backgroundColor: C.amberPill, paddingHorizontal: 14, paddingVertical: 6,
                     borderRadius: 20 },
  coinBadgeText:   { color: C.white, fontWeight: "700", fontSize: 14 },

  // Scroll
  scroll:          { flex: 1 },
  scrollContent:   { paddingHorizontal: 20, paddingBottom: 24 },

  // Section label
  sectionLabel:    { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: C.subtext,
                     textTransform: "uppercase", marginBottom: 12, marginTop: 4 },

  // Error
  error:           { color: "#C0392B", fontSize: 13, marginBottom: 10 },

  // Tier card
  tierCard:        { flexDirection: "row", alignItems: "center", backgroundColor: C.white,
                     borderRadius: 14, borderWidth: 1, borderColor: C.border,
                     padding: 16, marginBottom: 10 },
  tierEmoji:       { fontSize: 26, marginRight: 14 },
  tierInfo:        { flex: 1 },
  tierName:        { fontSize: 16, fontWeight: "700", color: C.brown },
  tierSub:         { fontSize: 12, color: C.subtext, marginTop: 2 },
  tierCoins:       { fontSize: 14, fontWeight: "600", color: C.brown, marginRight: 14 },
  joinBtn:         { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
                     borderWidth: 1.5, borderColor: C.terra },
  joinBtnText:     { color: C.terra, fontWeight: "700", fontSize: 13 },
  noTables:        { color: C.subtext, fontSize: 12, fontStyle: "italic" },

  // Solo Play card
  soloCard:        { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF8EE",
                     borderRadius: 14, borderWidth: 1.5, borderColor: C.terra,
                     padding: 16, marginBottom: 10 },
  soloEmoji:       { fontSize: 26, marginRight: 14 },
  soloInfo:        { flex: 1 },
  soloTitle:       { fontSize: 16, fontWeight: "700", color: C.brown },
  soloSub:         { fontSize: 12, color: C.subtext, marginTop: 2 },
  soloBtn:         { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
                     borderWidth: 1.5, borderColor: C.terra },
  soloBtnText:     { color: C.terra, fontWeight: "700", fontSize: 13 },

  // Create button
  createBtn:       { backgroundColor: C.terra, borderRadius: 14, padding: 16,
                     alignItems: "center", marginTop: 8 },
  createBtnText:   { color: C.white, fontSize: 16, fontWeight: "700" },

  // Bottom tab bar
  tabBar:          { flexDirection: "row", backgroundColor: C.tabBar,
                     paddingVertical: 10, paddingBottom: 20 },
  tabItem:         { flex: 1, alignItems: "center" },
  tabIcon:         { fontSize: 20 },
  tabLabel:        { color: "#7A5C44", fontSize: 11, marginTop: 3 },
  tabActive:       { color: C.amberPill, fontWeight: "700" },
});

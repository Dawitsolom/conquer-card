import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { trackEvent } from "../hooks/useAnalytics";
import {
  getPublicTables, getProfile, createTable, joinTable,
  type TablesByTier, type UserProfile,
} from "../services/apiService";

const TIERS = ["low", "medium", "high"] as const;
const TIER_LABELS: Record<typeof TIERS[number], string> = {
  low:    "Low Stakes (≤50)",
  medium: "Medium Stakes (51–200)",
  high:   "High Stakes (200+)",
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const displayName = user?.displayName ?? "Player";

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
  }, [user]);

  useEffect(() => { void loadData(); }, [loadData]);

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

  const handleSignOut = async () => {
    logout();
    await signOut(auth);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e94560" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {displayName}</Text>
          <Text style={styles.coins}>
            {profile ? `${profile.coinBalance} coins` : "—"}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Create private table */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>+ Create Private Table</Text>
      </TouchableOpacity>

      {/* Public table tiers */}
      <FlatList
        data={TIERS}
        keyExtractor={tier => tier}
        renderItem={({ item: tier }) => {
          const list = tables?.[tier] ?? [];
          return (
            <View style={styles.tier}>
              <Text style={styles.tierLabel}>{TIER_LABELS[tier]}</Text>
              {list.length === 0 ? (
                <Text style={styles.empty}>No tables — be the first!</Text>
              ) : (
                list.map(table => (
                  <View key={table.id} style={styles.tableRow}>
                    <Text style={styles.tableBet}>{table.betAmount} coins</Text>
                    <Text style={styles.tablePlayers}>
                      {table.playerCount}/{table.maxPlayers} players
                    </Text>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => handleJoin(table.id)}
                      disabled={joining === table.id}
                    >
                      {joining === table.id
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.joinText}>JOIN</Text>
                      }
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#1a1a2e", padding: 16 },
  center:           { flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center" },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  welcome:          { color: "#fff", fontSize: 18, fontWeight: "600" },
  coins:            { color: "#e94560", fontSize: 14, marginTop: 2 },
  signOut:          { color: "#666", fontSize: 14 },
  error:            { color: "#ff6b6b", fontSize: 13, marginBottom: 8 },
  createButton:     { backgroundColor: "#0f3460", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 20 },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tier:             { marginBottom: 20 },
  tierLabel:        { color: "#a0a0c0", fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" },
  empty:            { color: "#555", fontSize: 14, fontStyle: "italic" },
  tableRow:         { flexDirection: "row", alignItems: "center", backgroundColor: "#16213e", padding: 12, borderRadius: 10, marginBottom: 6 },
  tableBet:         { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1 },
  tablePlayers:     { color: "#a0a0c0", fontSize: 13, marginRight: 12 },
  joinButton:       { backgroundColor: "#e94560", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, minWidth: 60, alignItems: "center" },
  joinText:         { color: "#fff", fontSize: 14, fontWeight: "600" },
});

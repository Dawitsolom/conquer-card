import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface LeaderboardEntry { id: string; name: string; _count: { games: number } }

export default function LeaderboardScreen() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { playerId } = useGameStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(, {
          headers: { Authorization:  },
        });
        const json = await res.json() as LeaderboardEntry[];
        setData(json);
      } catch { } finally { setLoading(false); }
    };
    void fetchLeaderboard();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#e94560" size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Leaderboard</Text>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.games}>{item._count.games} games</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#1a1a2e", padding:16 },
  center: { flex:1, backgroundColor:"#1a1a2e", alignItems:"center", justifyContent:"center" },
  title: { color:"#fff", fontSize:28, fontWeight:"bold", marginBottom:24, textAlign:"center" },
  row: { flexDirection:"row", alignItems:"center", backgroundColor:"#16213e", padding:16, borderRadius:12, marginBottom:8 },
  rank: { color:"#e94560", fontSize:18, fontWeight:"bold", width:40 },
  name: { color:"#fff", fontSize:16, flex:1 },
  games: { color:"#a0a0c0", fontSize:14 },
});
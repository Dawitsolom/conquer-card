import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { signOut, getAuth } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useGameStore } from "../store/gameStore";
import { trackEvent } from "../hooks/useAnalytics";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function HomeScreen() {
  const router = useRouter();
  const { playerName, reset } = useGameStore();
  const [creating, setCreating] = useState(false);

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ betAmount: 100, jokerCount: 2 }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const { tableId } = (await res.json()) as { tableId: string };
      trackEvent("game_created", { tableId });
      router.push(`/game/${tableId}`);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not create game");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    reset();
    await signOut(auth);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Conquer Card</Text>
      <Text style={styles.subtitle}>Ethiopian Social Card Game</Text>
      <Text style={styles.welcome}>Welcome, {playerName || "Player"}!</Text>

      <TouchableOpacity style={styles.button} onPress={handleCreateGame} disabled={creating}>
        {creating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>🎮 Create Game</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.push("/leaderboard")}>
        <Text style={styles.buttonText}>🏆 Leaderboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.outline]} onPress={handleSignOut}>
        <Text style={[styles.buttonText, styles.outlineText]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#1a1a2e", alignItems:"center", justifyContent:"center", padding:24 },
  title: { fontSize:42, color:"#fff", fontWeight:"bold", marginBottom:8 },
  subtitle: { fontSize:16, color:"#a0a0c0", marginBottom:8 },
  welcome: { fontSize:18, color:"#e94560", marginBottom:40, fontWeight:"600" },
  button: { backgroundColor:"#e94560", paddingVertical:16, paddingHorizontal:48, borderRadius:12, marginBottom:12, width:"100%", alignItems:"center" },
  secondary: { backgroundColor:"#0f3460" },
  outline: { backgroundColor:"transparent", borderWidth:1, borderColor:"#444" },
  buttonText: { color:"#fff", fontSize:18, fontWeight:"600" },
  outlineText: { color:"#a0a0c0" },
});

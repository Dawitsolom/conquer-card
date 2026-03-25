import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useGameStore } from "../store/gameStore";

export default function HomeScreen() {
  const router = useRouter();
  const { playerName } = useGameStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Conquer Card</Text>
      <Text style={styles.subtitle}>Ethiopian Social Card Game</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/game/new")}>
        <Text style={styles.buttonText}>Create Game</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.push("/game/join")}>
        <Text style={styles.buttonText}>Join Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 42, color: "#fff", fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#a0a0c0", marginBottom: 48 },
  button: { backgroundColor: "#e94560", paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, marginBottom: 16, width: "100%", alignItems: "center" },
  secondary: { backgroundColor: "#16213e" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
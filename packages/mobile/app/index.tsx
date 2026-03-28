import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useGameStore } from "../store/gameStore";
import { trackEvent } from "../hooks/useAnalytics";

export default function HomeScreen() {
  const router = useRouter();
  const { playerName, reset } = useGameStore();

  const handleCreateGame = () => {
    // TODO Step 5: POST /tables/create then navigate
    trackEvent("game_created", {});
    router.push("/game/new");
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

      <TouchableOpacity style={styles.button} onPress={handleCreateGame}>
        <Text style={styles.buttonText}>🎮 Create Game</Text>
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
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useGameStore } from "../store/gameStore";

export default function LoginScreen() {
  const router = useRouter();
  const { setPlayerName, setPlayerId } = useGameStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert("Error","Email and password required"); return; }
    setLoading(true);
    try {
      let userCred;
      if (isSignUp) {
        if (!name) { Alert.alert("Error","Name required"); setLoading(false); return; }
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      setPlayerId(userCred.user.uid);
      setPlayerName(userCred.user.displayName ?? email.split("@")[0] ?? "Player");
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Auth Error", e.message ?? "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Conquer Card</Text>
      <Text style={styles.subtitle}>{isSignUp ? "Create Account" : "Sign In"}</Text>

      {isSignUp && (
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor="#666"
          value={name} onChangeText={setName} autoCapitalize="words" />
      )}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666"
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#666"
        value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSignUp ? "Create Account" : "Sign In"}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(s => !s)} style={styles.toggle}>
        <Text style={styles.toggleText}>{isSignUp ? "Already have an account? Sign in" : "New here? Create account"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#1a1a2e", alignItems:"center", justifyContent:"center", padding:24 },
  title: { fontSize:42, color:"#fff", fontWeight:"bold", marginBottom:8 },
  subtitle: { fontSize:18, color:"#a0a0c0", marginBottom:32 },
  input: { width:"100%", backgroundColor:"#16213e", color:"#fff", padding:16, borderRadius:12, marginBottom:12, fontSize:16, borderWidth:1, borderColor:"#333" },
  button: { width:"100%", backgroundColor:"#e94560", padding:16, borderRadius:12, alignItems:"center", marginTop:8 },
  buttonText: { color:"#fff", fontSize:18, fontWeight:"600" },
  toggle: { marginTop:24 },
  toggleText: { color:"#a0a0c0", fontSize:14 },
});
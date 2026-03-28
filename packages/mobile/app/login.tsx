import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import {
  signInWithEmail,
  registerWithEmail,
  signInAsGuest,
} from "../services/authService";

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setGuest, setLoading, isLoading } = useAuthStore();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name) { Alert.alert("Error", "Name required"); return; }
        const result = await registerWithEmail(email, password, name);
        setUser({ uid: result.uid, displayName: result.displayName, isGuest: false }, result.jwt);
      } else {
        const result = await signInWithEmail(email, password);
        setUser({ uid: result.uid, displayName: result.displayName, isGuest: false }, result.jwt);
      }
      router.replace("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Auth Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const result = await signInAsGuest();
      setGuest(result.uid, result.jwt);
      router.replace("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Guest Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conquer Card</Text>
      <Text style={styles.subtitle}>{isSignUp ? "Create Account" : "Sign In"}</Text>

      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={isLoading}>
        {isLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>{isSignUp ? "Create Account" : "Sign In"}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuest} disabled={isLoading}>
        <Text style={styles.buttonText}>Play as Guest</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(s => !s)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {isSignUp ? "Already have an account? Sign in" : "New here? Create account"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center", padding: 24 },
  title:       { fontSize: 42, color: "#fff", fontWeight: "bold", marginBottom: 8 },
  subtitle:    { fontSize: 18, color: "#a0a0c0", marginBottom: 32 },
  input:       { width: "100%", backgroundColor: "#16213e", color: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: "#333" },
  button:      { width: "100%", backgroundColor: "#e94560", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  guestButton: { backgroundColor: "#0f3460" },
  buttonText:  { color: "#fff", fontSize: 18, fontWeight: "600" },
  toggle:      { marginTop: 24 },
  toggleText:  { color: "#a0a0c0", fontSize: 14 },
});

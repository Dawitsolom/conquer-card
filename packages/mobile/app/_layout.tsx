import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import * as Sentry from "@sentry/react-native";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { trackEvent, identifyUser } from "../hooks/useAnalytics";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  tracesSampleRate: 1.0,
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { logout } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Firebase auth state tells us whether a session still exists.
    // If Firebase says signed out we clear the store too.
    // JWT is populated by login.tsx via authService — not here.
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      const inAuthGroup = segments[0] === "login";
      if (firebaseUser) {
        identifyUser(firebaseUser.uid, firebaseUser.displayName ?? "Player", firebaseUser.email ?? "");
        trackEvent("app_opened", { userId: firebaseUser.uid });
        if (inAuthGroup) router.replace("/");
      } else {
        logout();
        if (!inAuthGroup) router.replace("/login");
      }
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  if (!authChecked) return null;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#1a1a2e" }, headerTintColor: "#fff", headerTitleStyle: { fontWeight: "bold" } }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Conquer Card", headerRight: () => null }} />
      <Stack.Screen name="game/[roomId]" options={{ title: "Game Room" }} />
      <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
    </Stack>
  );
}
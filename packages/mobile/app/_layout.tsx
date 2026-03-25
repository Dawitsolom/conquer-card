import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import * as Sentry from "@sentry/react-native";
import { auth } from "../lib/firebase";
import { useGameStore } from "../store/gameStore";
import { trackEvent, identifyUser } from "../hooks/useAnalytics";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  tracesSampleRate: 1.0,
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setPlayerId, setPlayerName } = useGameStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const inAuthGroup = segments[0] === "login";
      if (user) {
        setPlayerId(user.uid);
        setPlayerName(user.displayName ?? "Player");
        identifyUser(user.uid, user.displayName ?? "Player", user.email ?? "");
        trackEvent("app_opened", { userId: user.uid });
        if (inAuthGroup) router.replace("/");
      } else {
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
import { Stack } from "expo-router";
import { useEffect } from "react";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#1a1a2e" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="index" options={{ title: "Conquer Card" }} />
      <Stack.Screen name="game/[roomId]" options={{ title: "Game" }} />
    </Stack>
  );
}
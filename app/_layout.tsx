import { Stack } from "expo-router";
import { AuthProvider } from "../lib/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="movie/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="watch/[id]" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

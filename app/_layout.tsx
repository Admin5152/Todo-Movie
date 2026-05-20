import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../lib/AuthContext";
import { MyListProvider } from "../lib/MyListContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { client } from "../lib/appwrite";

export default function RootLayout() {
  useEffect(() => {
    // Automatically ping Appwrite to verify connectivity and display status
    if (typeof (client as any).ping === 'function') {
      (client as any).ping();
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MyListProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="movie/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="watch/[id]" options={{ headerShown: false }} />
          </Stack>
        </MyListProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}


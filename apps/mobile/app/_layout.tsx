import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuthStore } from "@/store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function RootLayoutNav() {
  useAnalytics();
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0B14" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="player/[id]" options={{ presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

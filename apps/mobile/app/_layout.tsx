import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from "expo-font";
import * as Linking from "expo-linking";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuthStore } from "@/store/authStore";
import { ONBOARDING_COMPLETED_KEY } from "./onboarding";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * Brand fonts:
 *   CormorantGaramond_700Bold / CormorantGaramond_600SemiBold — headings
 *   DMSans_400Regular / DMSans_500Medium / DMSans_700Bold     — body / UI
 *
 * Usage in StyleSheet:
 *   fontFamily: "CormorantGaramond_700Bold"
 *   fontFamily: "DMSans_400Regular"
 */
function RootLayoutNav() {
  useAnalytics();
  const { restoreSession, setTokens } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Load brand fonts — non-blocking; screens render immediately and
  // swap to custom fonts once loaded (no splash-screen hold needed).
  const [fontsLoaded] = Font.useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    async function init() {
      await restoreSession();
      const done = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      if (!done) {
        router.replace("/onboarding");
      }
      setChecked(true);
    }
    init();
  }, []);

  // Handle deep link callback from OAuth login (riseharmony://auth?token=xxx)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      if (!url) return;

      // Parse the URL — handle both riseharmony://auth?token=xxx and
      // exp://...--/auth?token=xxx (dev client)
      const parsed = Linking.parse(url);
      if (parsed.path === "auth" || parsed.hostname === "auth") {
        const token = parsed.queryParams?.token as string | undefined;
        const error = parsed.queryParams?.error as string | undefined;

        if (error) {
          console.warn("[Auth] OAuth login failed:", error);
          return;
        }

        if (token) {
          // Store the token and restore the session
          await setTokens(token, token); // Use same token as refresh for now
          await restoreSession();
          // Navigate back to the main app
          router.replace("/(tabs)");
        }
      }
    };

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Handle deep link that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [setTokens, restoreSession, router]);

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
      <Stack.Screen name="login" options={{ presentation: "modal" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="player/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="meditation/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="chakra-journey" options={{ presentation: "card" }} />
      <Stack.Screen name="technology" options={{ presentation: "card" }} />
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

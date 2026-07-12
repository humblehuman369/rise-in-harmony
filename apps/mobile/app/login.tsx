/**
 * Login Screen
 * Opens the Manus OAuth portal in the system browser. After authentication,
 * the server redirects back to the app via deep link (riseharmony://auth?token=xxx).
 * The deep link is caught by the root _layout and stored in SecureStore.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as Linking from "expo-linking";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";

const API_BASE_URL = "https://www.riseinharmony.com";
const OAUTH_PORTAL_URL = "https://manus.im";
const APP_ID = "AtfyTVSdtA5G8ui7hAZ3a8";

/**
 * Build the OAuth login URL.
 * The redirectUri points to our mobile-specific callback which returns a
 * deep link with the session token instead of setting a cookie.
 */
function getLoginUrl(): string {
  const redirectUri = `${API_BASE_URL}/api/oauth/callback-mobile`;
  const state = btoa(redirectUri);
  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
}

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const loginUrl = getLoginUrl();
      const supported = await Linking.canOpenURL(loginUrl);
      if (supported) {
        await Linking.openURL(loginUrl);
      } else {
        Alert.alert("Error", "Cannot open the login page. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open login. Please try again.");
    } finally {
      // Reset loading after a short delay — the browser will open
      setTimeout(() => setLoading(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🔑</Text>
          <Text style={styles.heroTitle}>Sign In</Text>
          <Text style={styles.heroSubtitle}>
            Sign in to sync your sessions, favorites, and subscription across
            all your devices.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitItem}>☁️  Sync sessions & favorites</Text>
          <Text style={styles.benefitItem}>📊  Track your wellness journey</Text>
          <Text style={styles.benefitItem}>🔄  Restore purchases on any device</Text>
          <Text style={styles.benefitItem}>⏰  Cloud-backed alarm schedules</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.bgDeep} />
          ) : (
            <Text style={styles.ctaBtnText}>Continue with Manus</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          You'll be redirected to sign in securely via your browser.{"\n"}
          No password is stored in this app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  closeBtn: {
    position: "absolute",
    top: spacing[12],
    right: spacing[5],
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: colors.textMuted, fontSize: fontSizes.base },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  heroEmoji: { fontSize: 56, marginBottom: spacing[3] },
  heroTitle: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing[3],
  },
  heroSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  benefitsCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    gap: spacing[3],
    ...shadows.sm,
  },
  benefitItem: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  ctaBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.full,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginBottom: spacing[4],
    ...shadows.teal,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: {
    color: colors.bgDeep,
    fontSize: fontSizes.base,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  note: {
    fontSize: fontSizes.sm,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 18,
  },
});

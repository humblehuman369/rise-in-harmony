/**
 * Paywall Screen (Modal)
 * Displays RevenueCat subscription packages and handles the purchase flow.
 * Presented as a modal from any locked-content trigger.
 */
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { usePurchases } from "@/hooks/usePurchases";
import type { PurchasesPackage } from "react-native-purchases";

const FEATURES = [
  "🎵  All 13 healing frequencies",
  "🧘  Full meditation library",
  "⏰  Unlimited healing alarms",
  "🧬  Binaural beats (Alpha, Theta, Delta)",
  "🌀  7-Chakra journey sequences",
  "📊  Wellness dashboard & streak tracking",
  "🔇  Background audio (screen off)",
  "📵  Offline mode — no Wi-Fi needed",
];

function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

function formatPeriod(pkg: PurchasesPackage): string {
  const id = pkg.product.identifier.toLowerCase();
  if (id.includes("annual") || id.includes("yearly")) return "/ year";
  if (id.includes("monthly")) return "/ month";
  if (id.includes("lifetime")) return "one-time";
  return "";
}

function isPopular(pkg: PurchasesPackage): boolean {
  const id = pkg.product.identifier.toLowerCase();
  return id.includes("annual") || id.includes("yearly");
}

export default function PaywallScreen() {
  const router = useRouter();
  const { packages, isPremium, isLoading, error, purchasePackage, restorePurchases } =
    usePurchases();

  const [selectedPkg, setSelectedPkg] = React.useState<PurchasesPackage | null>(
    packages[0] ?? null
  );

  // Sync selection when packages load
  React.useEffect(() => {
    if (packages.length > 0 && !selectedPkg) {
      // Default to annual if available
      const annual = packages.find((p) =>
        p.product.identifier.toLowerCase().includes("annual")
      );
      setSelectedPkg(annual ?? packages[0]);
    }
  }, [packages]);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    const result = await purchasePackage(selectedPkg);
    if (result.success) {
      router.back();
    } else if (result.error && !result.error.includes("cancelled")) {
      Alert.alert("Purchase Failed", result.error);
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.isPremium) {
      Alert.alert("Restored", "Your premium access has been restored.", [
        { text: "Continue", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Nothing to restore", "No previous purchases found.");
    }
  };

  if (isPremium) {
    router.back();
    return null;
  }

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>Rise In Harmony</Text>
          <Text style={styles.heroPremium}>Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the full healing frequency library and all premium features.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f) => (
            <Text key={f} style={styles.featureItem}>
              {f}
            </Text>
          ))}
        </View>

        {/* Packages */}
        {isLoading ? (
          <ActivityIndicator
            color={colors.teal}
            size="large"
            style={{ marginVertical: spacing[8] }}
          />
        ) : packages.length === 0 ? (
          <View style={styles.noPackages}>
            <Text style={styles.noPackagesText}>
              Subscription packages unavailable.{"\n"}Please check your connection.
            </Text>
          </View>
        ) : (
          <View style={styles.packages}>
            {packages.map((pkg) => {
              const popular = isPopular(pkg);
              const selected = selectedPkg?.product.identifier === pkg.product.identifier;
              return (
                <TouchableOpacity
                  key={pkg.product.identifier}
                  style={[
                    styles.pkgCard,
                    selected && styles.pkgCardSelected,
                    popular && styles.pkgCardPopular,
                  ]}
                  onPress={() => setSelectedPkg(pkg)}
                  activeOpacity={0.8}
                >
                  {popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.pkgRow}>
                    <View style={styles.pkgLeft}>
                      <Text style={[styles.pkgTitle, selected && styles.pkgTitleSelected]}>
                        {pkg.product.title || pkg.packageType}
                      </Text>
                      <Text style={styles.pkgDesc} numberOfLines={2}>
                        {pkg.product.description}
                      </Text>
                    </View>
                    <View style={styles.pkgRight}>
                      <Text style={[styles.pkgPrice, selected && styles.pkgPriceSelected]}>
                        {formatPrice(pkg)}
                      </Text>
                      <Text style={styles.pkgPeriod}>{formatPeriod(pkg)}</Text>
                    </View>
                  </View>
                  {selected && (
                    <View style={styles.selectedCheck}>
                      <Text style={styles.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            (!selectedPkg || isLoading) && styles.ctaBtnDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPkg || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.bgDeep} />
          ) : (
            <Text style={styles.ctaBtnText}>
              {selectedPkg
                ? `Start Premium — ${formatPrice(selectedPkg)}`
                : "Select a plan"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore + legal */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the
          current period. Manage or cancel in your App Store account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// React import needed for useState/useEffect in this file
import React from "react";

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
  scroll: { paddingBottom: spacing[12] },
  // Hero
  hero: {
    alignItems: "center",
    paddingTop: spacing[8],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[5],
  },
  heroEmoji: { fontSize: 56, marginBottom: spacing[3] },
  heroTitle: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  heroPremium: {
    fontSize: fontSizes.xl,
    color: colors.teal,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing[3],
  },
  heroSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  // Features
  featuresCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
    gap: spacing[3],
    ...shadows.sm,
  },
  featureItem: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Packages
  packages: {
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  pkgCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    position: "relative",
    ...shadows.sm,
  },
  pkgCardSelected: {
    borderColor: "rgba(0,212,170,0.5)",
    backgroundColor: "rgba(0,212,170,0.06)",
  },
  pkgCardPopular: {
    borderColor: "rgba(0,212,170,0.3)",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: colors.teal,
    paddingHorizontal: spacing[3],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  popularBadgeText: {
    color: colors.bgDeep,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pkgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pkgLeft: { flex: 1, paddingRight: spacing[3] },
  pkgTitle: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  pkgTitleSelected: { color: colors.teal },
  pkgDesc: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  pkgRight: { alignItems: "flex-end" },
  pkgPrice: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  pkgPriceSelected: { color: colors.teal },
  pkgPeriod: { fontSize: fontSizes.xs, color: colors.textMuted },
  selectedCheck: {
    position: "absolute",
    top: spacing[3],
    right: spacing[3],
  },
  selectedCheckText: { color: colors.teal, fontSize: fontSizes.base, fontWeight: "700" },
  noPackages: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
    alignItems: "center",
  },
  noPackagesText: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    fontSize: fontSizes.base,
  },
  // CTA
  ctaBtn: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.teal,
    borderRadius: radii.full,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginBottom: spacing[3],
    ...shadows.teal,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: {
    color: colors.bgDeep,
    fontSize: fontSizes.base,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Restore
  restoreBtn: {
    alignItems: "center",
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
  },
  restoreBtnText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textDecorationLine: "underline",
  },
  // Legal
  legal: {
    fontSize: 11,
    color: colors.textDim,
    textAlign: "center",
    paddingHorizontal: spacing[6],
    lineHeight: 16,
  },
  // Needed for textSecondary
  textSecondary: { color: colors.textSecondary },
});

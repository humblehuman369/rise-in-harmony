/**
 * Tab Layout — Rise In Harmony Mobile
 *
 * Uses a custom scrollable tab bar so all 10 tabs show full labels
 * without truncation. Users swipe horizontally to reveal more tabs.
 * The active tab is always visible (auto-scrolled into view).
 */
import { useRef, useEffect } from "react";
import { Tabs, usePathname } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@rih/ui-tokens";
import {
  Home,
  Map,
  AlarmClock,
  Headphones,
  Music2,
  Sparkles,
  Layers,
  BookOpen,
  GraduationCap,
  BarChart2,
} from "lucide-react-native";
import { useRouter } from "expo-router";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { name: "index",      label: "Home",      route: "/",               Icon: Home          },
  { name: "journey",    label: "Journey",   route: "/journey",        Icon: Map           },
  { name: "alarm",      label: "Alarm",     route: "/alarm",          Icon: AlarmClock    },
  { name: "meditation", label: "Meditate",  route: "/meditation",     Icon: Headphones    },
  { name: "player",     label: "Frequency", route: "/player",         Icon: Music2        },
  { name: "reiki",      label: "Reiki",     route: "/reiki",          Icon: Sparkles      },
  { name: "studio",     label: "Studio",    route: "/studio",         Icon: Layers        },
  { name: "library",    label: "Library",   route: "/library",        Icon: BookOpen      },
  { name: "learn",      label: "Learn",     route: "/learn",          Icon: GraduationCap },
  { name: "dashboard",  label: "Dashboard", route: "/dashboard",      Icon: BarChart2     },
] as const;

// ─── Custom scrollable tab bar ─────────────────────────────────────────────────
function ScrollableTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Determine active tab from current path
  const activeIndex = TABS.findIndex((t) => {
    if (t.name === "index") return pathname === "/";
    return pathname.startsWith(t.route);
  });

  // Auto-scroll to keep active tab visible
  useEffect(() => {
    if (activeIndex < 0) return;
    // Each tab is ~80px wide; scroll so active tab is centred
    const TAB_W = 80;
    const offset = Math.max(0, activeIndex * TAB_W - SCREEN_W / 2 + TAB_W / 2);
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [activeIndex]);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {/* Thin top border */}
      <View style={styles.topBorder} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {TABS.map((tab, i) => {
          const isActive = i === activeIndex;
          const { Icon } = tab;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.7}
            >
              {/* Active indicator dot */}
              {isActive && <View style={styles.activeDot} />}

              {/* Icon with teal background when active */}
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon
                  size={20}
                  color={isActive ? colors.teal : "#6B7A99"}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </View>

              {/* Full label — never truncated */}
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <ScrollableTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"      options={{ title: "Home"      }} />
      <Tabs.Screen name="journey"    options={{ title: "Journey"   }} />
      <Tabs.Screen name="alarm"      options={{ title: "Alarm"     }} />
      <Tabs.Screen name="meditation" options={{ title: "Meditate"  }} />
      <Tabs.Screen name="player"     options={{ title: "Frequency" }} />
      <Tabs.Screen name="reiki"      options={{ title: "Reiki"     }} />
      <Tabs.Screen name="studio"     options={{ title: "Studio"    }} />
      <Tabs.Screen name="library"    options={{ title: "Library"   }} />
      <Tabs.Screen name="learn"      options={{ title: "Learn"     }} />
      <Tabs.Screen name="dashboard"  options={{ title: "Dashboard" }} />
      {/* Hidden routable screens */}
      <Tabs.Screen name="precision"  options={{ href: null }} />
      <Tabs.Screen name="programs"   options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: "#0D0F1E",
    // No fixed height — grows with content + safe area
  },
  topBorder: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: "center",
  },
  tabItem: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.teal,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: "rgba(0,212,170,0.12)",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7A99",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: colors.teal,
    fontWeight: "600",
  },
});

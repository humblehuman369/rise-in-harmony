import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { colors } from "@rih/ui-tokens";
import {
  Home,
  Music2,
  Waves,
  Sliders,
  AlarmClock,
  BarChart2,
  BookOpen,
} from "lucide-react-native";

// Tab bar icon wrapper with active highlight
function TabIcon({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconActive]}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Home size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="player"
        options={{
          title: "Player",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Music2 size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      {/* Precision merged into Studio — keep routable but hidden from tab bar */}
      <Tabs.Screen name="precision" options={{ href: null }} />
      <Tabs.Screen
        name="meditation"
        options={{
          title: "Meditate",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Waves size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: "Studio",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Sliders size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      {/* Library duplicates the Player grid; keep it routable (linked from
          Home) but out of the tab bar so we stay at 7 tabs. */}
      <Tabs.Screen name="library" options={{ href: null }} />
      {/* Programs — reachable from Dashboard / Home, not a primary tab */}
      <Tabs.Screen name="programs" options={{ href: null, title: "Programs" }} />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <BookOpen size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="alarm"
        options={{
          title: "Alarm",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <AlarmClock size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <BarChart2 size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#0D0F1E",
    borderTopColor: "rgba(255,255,255,0.06)",
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  iconActive: {
    backgroundColor: "rgba(0,212,170,0.12)",
  },
});

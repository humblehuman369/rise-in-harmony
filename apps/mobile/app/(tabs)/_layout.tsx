import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { colors } from "@rih/ui-tokens";

// Tab bar icons using simple SVG-based components
function TabIcon({
  focused,
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
              {/* Home icon placeholder — replace with lucide-react-native */}
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
              {/* Play icon placeholder */}
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="meditation"
        options={{
          title: "Meditate",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              {/* Meditation icon placeholder */}
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              {/* Library icon placeholder */}
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
              {/* Alarm icon placeholder */}
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
              {/* Chart icon placeholder */}
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

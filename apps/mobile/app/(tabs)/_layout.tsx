import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
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
      {/* 1. Home */}
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

      {/* 2. Journey (7-Chakra) */}
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Map size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 3. Alarm */}
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

      {/* 4. Meditate */}
      <Tabs.Screen
        name="meditation"
        options={{
          title: "Meditate",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Headphones size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 5. Frequency (Player) */}
      <Tabs.Screen
        name="player"
        options={{
          title: "Frequency",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Music2 size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 6. Reiki */}
      <Tabs.Screen
        name="reiki"
        options={{
          title: "Reiki",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Sparkles size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 7. Studio */}
      <Tabs.Screen
        name="studio"
        options={{
          title: "Studio",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <Layers size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 8. Library */}
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <BookOpen size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 9. Learn */}
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color}>
              <GraduationCap size={20} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* 10. Dashboard */}
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

      {/* Hidden routable screens — not in tab bar */}
      <Tabs.Screen name="precision" options={{ href: null }} />
      <Tabs.Screen name="programs" options={{ href: null, title: "Programs" }} />
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

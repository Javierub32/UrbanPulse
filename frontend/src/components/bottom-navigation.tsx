import { SymbolView } from "expo-symbols";
import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import type { TabTriggerSlotProps } from "expo-router/ui";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

const tabSymbols = {
  home: { ios: "house.fill", android: "home", web: "home" },
  explore: { ios: "safari.fill", android: "explore", web: "explore" },
  report: { ios: "plus", android: "add", web: "add" },
  incidents: {
    ios: "list.bullet.rectangle",
    android: "assignment",
    web: "list",
  },
  profile: {
    ios: "person.crop.circle.fill",
    android: "account_circle",
    web: "person",
  },
} as const;

type TabName = keyof typeof tabSymbols;

type NavigationTabProps = TabTriggerSlotProps & {
  icon: TabName;
  label: string;
  prominent?: boolean;
};

function NavigationTab({
  icon,
  isFocused,
  label,
  prominent = false,
  ...pressableProps
}: NavigationTabProps) {
  const isDark = useColorScheme() === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const accent = isDark ? "#66D9C9" : "#117D73";

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) =>
        StyleSheet.flatten([styles.tab, pressed && styles.pressed])
      }
    >
      {prominent ? (
        <View
          style={[
            styles.reportButton,
            { backgroundColor: isDark ? "#168F84" : "#117D73" },
          ]}
        >
          <SymbolView name={tabSymbols[icon]} tintColor="#FFFFFF" size={24} />
        </View>
      ) : (
        <View
          style={[
            styles.iconWell,
            isFocused && { backgroundColor: colors.backgroundSelected },
          ]}
        >
          <SymbolView
            name={tabSymbols[icon]}
            tintColor={isFocused ? accent : colors.textSecondary}
            size={22}
          />
        </View>
      )}
      <ThemedText
        type="small"
        style={[
          styles.label,
          { color: isFocused ? accent : colors.textSecondary },
          prominent && styles.reportLabel,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function BottomNavigation() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const tabBarStyle = StyleSheet.flatten([
    styles.tabBar,
    {
      height: 72 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 8),
      backgroundColor: colors.backgroundElement,
    },
  ]);

  return (
    <Tabs>
      <TabSlot style={styles.tabSlot} />
      <TabList asChild>
        <View style={tabBarStyle}>
          <Svg
            width={96}
            height={42}
            viewBox="0 0 96 42"
            style={styles.notch}
            pointerEvents="none"
          >
            <Path
              d="M 0 0 C 18 0 18 42 48 42 C 78 42 78 0 96 0 Z"
              fill={colors.background}
            />
          </Svg>
          <TabTrigger name="home" href="/" asChild>
            <NavigationTab icon="home" label="Inicio" />
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <NavigationTab icon="explore" label="Explorar" />
          </TabTrigger>
          <TabTrigger name="report" href="/report" asChild>
            <NavigationTab icon="report" label="Reportar" prominent />
          </TabTrigger>
          <TabTrigger name="incidents" href="/incidents" asChild>
            <NavigationTab icon="incidents" label="Incidencias" />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <NavigationTab icon="profile" label="Perfil" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabSlot: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingTop: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    ...Platform.select({
      web: { boxShadow: "0 -4px 14px rgba(0, 0, 0, 0.1)" },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 14,
      },
    }),
  },
  notch: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 96,
    height: 42,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: 56,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3,
  },
  iconWell: {
    width: 38,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reportButton: {
    width: 52,
    height: 52,
    marginTop: -17,
    marginBottom: -17,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 3px 6px rgba(0, 0, 0, 0.22)" },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
  },
  reportLabel: {
    marginTop: 17,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});

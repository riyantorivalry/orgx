import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { theme } from "./src/lib/theme";
import { AdminHomeScreen } from "./src/screens/AdminHomeScreen";
import { AdminLoginScreen } from "./src/screens/AdminLoginScreen";
import { MemberCheckInScreen } from "./src/screens/MemberCheckInScreen";
import type { AdminAuthUser } from "./src/types/admin";

type RootTab = "checkin" | "admin";

export default function App() {
  const [tab, setTab] = useState<RootTab>("checkin");
  const [adminUser, setAdminUser] = useState<AdminAuthUser | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>ORGX Attendance</Text>
        <Text style={styles.subtitle}>{tab === "checkin" ? "Member self check-in" : "Admin operations"}</Text>
      </View>

      <View style={styles.body}>
        {tab === "checkin" ? <MemberCheckInScreen /> : null}
        {tab === "admin" && !adminUser ? <AdminLoginScreen onLoggedIn={setAdminUser} /> : null}
        {tab === "admin" && adminUser ? <AdminHomeScreen user={adminUser} onLogout={() => setAdminUser(null)} /> : null}
      </View>

      <View style={styles.bottomNav}>
        <TabButton label="Check-In" active={tab === "checkin"} onPress={() => setTab("checkin")} />
        <TabButton label="Admin" active={tab === "admin"} onPress={() => setTab("admin")} />
      </View>
    </SafeAreaView>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]} hitSlop={6}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d3deef",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  brand: {
    color: theme.primaryStrong,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: theme.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  bottomNav: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#d3deef",
    backgroundColor: "rgba(255,255,255,0.97)",
  },
  tabButton: {
    flex: 1,
    borderColor: "#c5d6fb",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#eef4ff",
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primaryStrong,
  },
  tabText: {
    color: "#1f3f74",
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  body: {
    flex: 1,
  },
});

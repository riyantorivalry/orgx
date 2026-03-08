import { useState } from "react";
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { theme } from "./src/lib/theme";
import { AdminHomeScreen } from "./src/screens/AdminHomeScreen";
import { AdminLoginScreen } from "./src/screens/AdminLoginScreen";
import { authApi } from "./src/services/authApi";
import type { AdminAuthUser } from "./src/types/admin";

type AdminTab = "home" | "sessions" | "members";

export default function App() {
  const [adminUser, setAdminUser] = useState<AdminAuthUser | null>(null);
  const [tab, setTab] = useState<AdminTab>("home");

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setAdminUser(null);
      setTab("home");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>ORGX Attendance</Text>
        <Text style={styles.subtitle}>{adminUser ? "Admin operations" : "Admin login required"}</Text>
      </View>

      <View style={[styles.body, adminUser && styles.bodyWithNav]}>
        {!adminUser ? <AdminLoginScreen onLoggedIn={setAdminUser} /> : <AdminHomeScreen user={adminUser} view={tab} />}
      </View>

      {adminUser ? (
        <View style={styles.bottomNav}>
          <TabButton label="Home" active={tab === "home"} onPress={() => setTab("home")} />
          <TabButton label="Sessions" active={tab === "sessions"} onPress={() => setTab("sessions")} />
          <TabButton label="Members" active={tab === "members"} onPress={() => setTab("members")} />
          <TabButton label="Logout" active={false} onPress={() => void logout()} danger />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  danger?: boolean;
};

function TabButton({ label, active, onPress, danger }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive, danger && styles.tabButtonDanger]} hitSlop={6}>
      <Text style={[styles.tabText, active && styles.tabTextActive, danger && styles.tabTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
    ...Platform.select({
      web: {
        height: "100vh",
        overflow: "hidden",
      },
    }),
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
    ...Platform.select({
      web: {
        position: "fixed",
      },
      default: {
        position: "absolute",
      },
    }),
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
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
  tabButtonDanger: {
    backgroundColor: "#fff1f1",
    borderColor: "#f0bebe",
  },
  tabText: {
    color: "#1f3f74",
    fontWeight: "800",
    fontSize: 12,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabTextDanger: {
    color: "#9d2424",
  },
  body: {
    flex: 1,
  },
  bodyWithNav: {
    paddingBottom: 82,
  },
});

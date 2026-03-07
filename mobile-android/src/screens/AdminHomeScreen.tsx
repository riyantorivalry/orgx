import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { ListSkeleton } from "../components/ListSkeleton";
import { Screen } from "../components/Screen";
import { StatusBanner } from "../components/StatusBanner";
import { formatDateTime } from "../lib/date";
import { theme } from "../lib/theme";
import { adminApi } from "../services/adminApi";
import { authApi } from "../services/authApi";
import type { AdminAuthUser, AdminMember, AdminSessionDashboard, AdminSessionListItem } from "../types/admin";

type AdminView = "dashboard" | "sessions" | "members";

type AdminHomeScreenProps = {
  user: AdminAuthUser;
  onLogout: () => void;
};

function parseDate(value: string): number {
  return new Date(value).getTime();
}

function formatRate(value: number | undefined): string {
  if (value === undefined) {
    return "-";
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export function AdminHomeScreen({ user, onLogout }: AdminHomeScreenProps) {
  const [view, setView] = useState<AdminView>("dashboard");
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, AdminSessionDashboard>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  const currentSession = useMemo(() => {
    const now = Date.now();
    return sessions.find((s) => parseDate(s.startsAt) <= now && parseDate(s.endsAt) >= now && s.status === "ACTIVE") || null;
  }, [sessions]);

  const incomingSessions = useMemo(
    () => sessions.filter((s) => parseDate(s.startsAt) > Date.now()).sort((a, b) => parseDate(a.startsAt) - parseDate(b.startsAt)).slice(0, 8),
    [sessions],
  );

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [sessionData, memberData] = await Promise.all([adminApi.listSessions(), adminApi.listMembers("", true)]);
      setSessions(sessionData);
      setMembers(memberData);

      const metricIds = [sessionData[0]?.id, sessionData[1]?.id, sessionData[2]?.id].filter((id): id is string => Boolean(id));
      const metricResults = await Promise.allSettled(metricIds.map((id) => adminApi.getDashboard(id)));
      const next: Record<string, AdminSessionDashboard> = {};
      metricResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          next[metricIds[index]] = result.value;
        }
      });
      setSessionMetrics(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      onLogout();
    }
  }

  return (
    <Screen title="Operations Dashboard" subtitle={`Signed in as ${user.username}`} scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      <Card>
        <View style={styles.navRow}>
          {(["dashboard", "sessions", "members"] as const).map((item) => (
            <Pressable key={item} style={[styles.navItem, view === item && styles.navItemActive]} onPress={() => setView(item)}>
              <Text style={[styles.navText, view === item && styles.navTextActive]}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={styles.listPane}>
        {loading && !sessions.length && !members.length ? <ListSkeleton rows={8} /> : null}

        {view === "dashboard" && !loading ? (
          <FlatList
            data={incomingSessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <>
                <Card>
                  <Text style={styles.sectionTitle}>Quick Summary</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryChip}>
                      <Text style={styles.summaryLabel}>Sessions</Text>
                      <Text style={styles.summaryValue}>{sessions.length}</Text>
                    </View>
                    <View style={styles.summaryChip}>
                      <Text style={styles.summaryLabel}>Members</Text>
                      <Text style={styles.summaryValue}>{members.length}</Text>
                    </View>
                    <View style={styles.summaryChip}>
                      <Text style={styles.summaryLabel}>Active Now</Text>
                      <Text style={styles.summaryValue}>{currentSession ? 1 : 0}</Text>
                    </View>
                  </View>
                </Card>
                <Card>
                  <Text style={styles.sectionTitle}>Current Session</Text>
                  {!currentSession ? <Text style={styles.meta}>No active session right now.</Text> : null}
                  {currentSession ? (
                    <>
                      <Text style={styles.titleStrong}>{currentSession.eventName}</Text>
                      <Text style={styles.meta}>{formatDateTime(currentSession.startsAt)} - {formatDateTime(currentSession.endsAt)}</Text>
                      <Text style={styles.meta}>Total Check-ins: {sessionMetrics[currentSession.id]?.totalCheckIns ?? "-"}</Text>
                      <Text style={styles.meta}>Check-in Rate: {formatRate(sessionMetrics[currentSession.id]?.checkInRatePercent)}</Text>
                    </>
                  ) : null}
                </Card>
                <Text style={styles.sectionTitle}>Incoming Sessions</Text>
              </>
            }
            ListEmptyComponent={<Text style={styles.meta}>No incoming session scheduled.</Text>}
            renderItem={({ item }) => (
              <View style={styles.rowItem}>
                <Text style={styles.titleStrong}>{item.eventName}</Text>
                <Text style={styles.meta}>{formatDateTime(item.startsAt)}</Text>
                <Text style={styles.meta}>{item.mandatory ? "Mandatory" : "Optional"} | {item.status}</Text>
              </View>
            )}
          />
        ) : null}

        {view === "sessions" && !loading ? (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={<Text style={styles.sectionTitle}>All Sessions ({sessions.length})</Text>}
            ListEmptyComponent={<Text style={styles.meta}>No sessions yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.rowItem}>
                <Text style={styles.titleStrong}>{item.eventName}</Text>
                <Text style={styles.meta}>{formatDateTime(item.startsAt)} - {formatDateTime(item.endsAt)}</Text>
                <Text style={styles.meta}>Type: {item.mandatory ? "Mandatory" : "Optional"} | {item.status}</Text>
              </View>
            )}
          />
        ) : null}

        {view === "members" && !loading ? (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={<Text style={styles.sectionTitle}>Members ({members.length})</Text>}
            ListEmptyComponent={<Text style={styles.meta}>No members found.</Text>}
            renderItem={({ item }) => (
              <View style={styles.rowItem}>
                <Text style={styles.titleStrong}>{item.fullName}</Text>
                <Text style={styles.meta}>Code: {item.memberCode}</Text>
                <Text style={styles.meta}>Status: {item.active ? "Active" : "Inactive"}</Text>
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.actionsBar}>
        <Pressable style={styles.actionSecondary} onPress={() => void loadAll()} disabled={loading}>
          <Text style={styles.actionSecondaryText}>{loading ? "Refreshing..." : "Refresh"}</Text>
        </Pressable>
        <Pressable style={styles.actionDanger} onPress={() => void logout()}>
          <Text style={styles.actionDangerText}>Logout</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    gap: 8,
  },
  navItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#c6d8f8",
    borderRadius: 11,
    paddingVertical: 9,
    backgroundColor: "#eef4ff",
    alignItems: "center",
  },
  navItemActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primaryStrong,
  },
  navText: {
    color: "#1f3f74",
    fontSize: 12,
    fontWeight: "800",
  },
  navTextActive: {
    color: "#fff",
  },
  listPane: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  sectionTitle: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  titleStrong: {
    color: "#183a72",
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: "#304056",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  rowItem: {
    borderWidth: 1,
    borderColor: "#d5e1f4",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#f5f9ff",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d2dff2",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#f8fbff",
  },
  summaryLabel: {
    color: "#4a6185",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    marginTop: 3,
    color: "#143562",
    fontSize: 18,
    fontWeight: "800",
  },
  actionsBar: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#d6e2f3",
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionSecondary: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#b8cbe8",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionSecondaryText: {
    color: "#2e476c",
    fontWeight: "700",
  },
  actionDanger: {
    minWidth: 96,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#f0bebe",
    borderRadius: 10,
    backgroundColor: "#fff1f1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionDangerText: {
    color: "#9d2424",
    fontWeight: "700",
  },
});

import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { ListSkeleton } from "../components/ListSkeleton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBanner } from "../components/StatusBanner";
import { TextField } from "../components/TextField";
import { formatDateTime } from "../lib/date";
import { theme } from "../lib/theme";
import { attendanceApi } from "../services/attendanceApi";
import type { AttendanceResult, Member, PublicSession } from "../types/attendance";

export function MemberCheckInScreen() {
  const [token, setToken] = useState("");
  const [session, setSession] = useState<PublicSession | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [submittingMemberId, setSubmittingMemberId] = useState("");

  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.fullName.localeCompare(b.fullName)), [members]);

  const loadSession = async () => {
    if (!token.trim()) {
      setError("Token is required.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const sessionData = await attendanceApi.validateToken(token.trim());
      setSession(sessionData);
      const memberData = await attendanceApi.listMembers(sessionData.id, "");
      setMembers(memberData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to validate token");
      setSession(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchMembers = async () => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const memberData = await attendanceApi.listMembers(session.id, query);
      setMembers(memberData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async (memberId: string) => {
    if (!token.trim()) {
      return;
    }
    setSubmittingMemberId(memberId);
    setError("");
    setResult(null);
    try {
      const payload = await attendanceApi.submitAttendance(token.trim(), memberId);
      setResult({ status: payload.status || "recorded", message: payload.message || "Attendance recorded" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Attendance submission failed");
    } finally {
      setSubmittingMemberId("");
    }
  };

  return (
    <Screen title="Attendance Check-in" subtitle="Select your name and tap once to submit attendance." scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {result ? <StatusBanner tone={result.status === "recorded" ? "success" : "warning"} message={result.message} /> : null}

      <Card>
        <TextField label="QR Token" value={token} onChangeText={setToken} placeholder="Paste token from QR link" />
        <PrimaryButton title={loading ? "Loading..." : "Validate Token"} onPress={() => void loadSession()} disabled={loading} />
      </Card>

      {session ? (
        <>
          <Card>
            <Text style={styles.sessionTitle}>{session.eventName}</Text>
            <Text style={styles.sessionMeta}>{formatDateTime(session.startsAt)} - {formatDateTime(session.endsAt)}</Text>
            <Text style={styles.sessionMeta}>Status: {session.status}</Text>
            <Text style={styles.sessionHint}>{sortedMembers.length} members available</Text>
          </Card>

          <View style={styles.listPane}>
            <View style={styles.stickyBar}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or code"
                placeholderTextColor="#7a879a"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={() => void searchMembers()}
              />
              <Pressable style={styles.searchButton} onPress={() => void searchMembers()} disabled={loading}>
                <Text style={styles.searchButtonText}>{loading ? "..." : "Search"}</Text>
              </Pressable>
            </View>

            {loading ? (
              <ListSkeleton rows={7} />
            ) : (
              <FlatList
                data={sortedMembers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.fullName}</Text>
                      <Text style={styles.memberCode}>Code: {item.memberCode}</Text>
                    </View>
                    <Pressable
                      style={styles.memberCta}
                      onPress={() => void submitAttendance(item.id)}
                      disabled={Boolean(submittingMemberId)}
                    >
                      <Text style={styles.memberCtaText}>{submittingMemberId === item.id ? "..." : "Check In"}</Text>
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sessionTitle: {
    color: theme.ink,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 4,
  },
  sessionMeta: {
    color: "#304056",
    fontSize: 14,
    marginBottom: 3,
    fontWeight: "600",
  },
  sessionHint: {
    marginTop: 2,
    color: "#4f6384",
    fontSize: 13,
    fontWeight: "700",
  },
  listPane: {
    flex: 1,
  },
  stickyBar: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d5e1f4",
    backgroundColor: "rgba(255,255,255,0.95)",
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#a8b8d3",
    borderRadius: 10,
    backgroundColor: "#fff",
    color: theme.ink,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  searchButton: {
    minHeight: 40,
    minWidth: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 14,
  },
  emptyText: {
    color: theme.muted,
    fontSize: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#c5d6fb",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
    paddingRight: 8,
  },
  memberName: {
    color: "#1f3f74",
    fontWeight: "800",
    fontSize: 15,
  },
  memberCode: {
    marginTop: 2,
    color: "#36598d",
    fontSize: 12,
    fontWeight: "700",
  },
  memberCta: {
    minWidth: 84,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  memberCtaText: {
    color: theme.primary,
    fontWeight: "700",
    fontSize: 12,
  },
});

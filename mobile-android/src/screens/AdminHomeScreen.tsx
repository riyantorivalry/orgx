import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { ListSkeleton } from "../components/ListSkeleton";
import { Screen } from "../components/Screen";
import { StatusBanner } from "../components/StatusBanner";
import { TextField } from "../components/TextField";
import { formatDateTime } from "../lib/date";
import { theme } from "../lib/theme";
import { adminApi, type CreateMemberInput } from "../services/adminApi";
import { authApi } from "../services/authApi";
import type { AdminAuthUser, AdminMember, AdminSessionDashboard, AdminSessionListItem } from "../types/admin";

type AdminView = "dashboard" | "sessions" | "members";

type AdminHomeScreenProps = {
  user: AdminAuthUser;
  onLogout: () => void;
};

type MemberFormState = {
  fullName: string;
  dob: string;
  bloodType: string;
  address: string;
  email: string;
  mobileNumber: string;
  active: boolean;
};

const EMPTY_MEMBER_FORM: MemberFormState = {
  fullName: "",
  dob: "",
  bloodType: "",
  address: "",
  email: "",
  mobileNumber: "",
  active: true,
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

function formToInput(form: MemberFormState): CreateMemberInput {
  return {
    fullName: form.fullName.trim(),
    active: form.active,
    dob: form.dob.trim() || undefined,
    bloodType: form.bloodType.trim() || undefined,
    address: form.address.trim() || undefined,
    email: form.email.trim() || undefined,
    mobileNumber: form.mobileNumber.trim() || undefined,
  };
}

function memberToForm(member: AdminMember): MemberFormState {
  return {
    fullName: member.fullName ?? "",
    dob: member.dob ?? "",
    bloodType: member.bloodType ?? "",
    address: member.address ?? "",
    email: member.email ?? "",
    mobileNumber: member.mobileNumber ?? "",
    active: member.active,
  };
}

async function confirmAction(title: string, message: string): Promise<boolean> {
  const webConfirm = (globalThis as { confirm?: (value?: string) => boolean }).confirm;
  if (typeof webConfirm === "function") {
    return webConfirm(message);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Continue", style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function AdminHomeScreen({ user, onLogout }: AdminHomeScreenProps) {
  const [view, setView] = useState<AdminView>("dashboard");
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, AdminSessionDashboard>>({});
  const [membersQuery, setMembersQuery] = useState("");
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  async function refreshMembers(query = membersQuery) {
    const memberData = await adminApi.listMembers(query, true);
    setMembers(memberData);
  }

  async function runMemberSearch() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await refreshMembers(membersQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to search members");
    } finally {
      setLoading(false);
    }
  }

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm(EMPTY_MEMBER_FORM);
  }

  function startEditMember(member: AdminMember) {
    setEditingMemberId(member.id);
    setMemberForm(memberToForm(member));
    setError("");
    setSuccess("");
  }

  async function saveMember() {
    if (!memberForm.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setMemberSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = formToInput(memberForm);
      if (editingMemberId) {
        await adminApi.updateMember(editingMemberId, payload);
        setSuccess("Member updated.");
      } else {
        await adminApi.createMember(payload);
        setSuccess("Member created.");
      }
      resetMemberForm();
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save member");
    } finally {
      setMemberSaving(false);
    }
  }

  async function toggleMemberActive(member: AdminMember) {
    const nextActive = !member.active;
    const ok = await confirmAction(
      `${nextActive ? "Activate" : "Deactivate"} Member`,
      `Do you want to ${nextActive ? "activate" : "deactivate"} ${member.fullName}?`,
    );
    if (!ok) {
      return;
    }

    setMemberSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateMember(member.id, {
        fullName: member.fullName,
        active: nextActive,
        dob: member.dob ?? undefined,
        bloodType: member.bloodType ?? undefined,
        address: member.address ?? undefined,
        email: member.email ?? undefined,
        mobileNumber: member.mobileNumber ?? undefined,
      });
      setSuccess(`Member ${nextActive ? "activated" : "deactivated"}.`);
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update member status");
    } finally {
      setMemberSaving(false);
    }
  }

  async function deleteMember(member: AdminMember) {
    const ok = await confirmAction("Delete Member", `Delete ${member.fullName}? This action cannot be undone.`);
    if (!ok) {
      return;
    }

    setMemberSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteMember(member.id);
      setSuccess("Member deleted.");
      if (editingMemberId === member.id) {
        resetMemberForm();
      }
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete member");
    } finally {
      setMemberSaving(false);
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
      {success ? <StatusBanner tone="success" message={success} /> : null}

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

        {view === "dashboard" ? (
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

        {view === "sessions" ? (
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

        {view === "members" ? (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <Card>
                  <Text style={styles.sectionTitle}>{editingMemberId ? "Edit Member" : "Create Member"}</Text>
                  <TextField
                    label="Full Name"
                    value={memberForm.fullName}
                    onChangeText={(value) => setMemberForm((prev) => ({ ...prev, fullName: value }))}
                    placeholder="e.g. John Doe"
                  />
                  <TextField
                    label="Date of Birth (YYYY-MM-DD)"
                    value={memberForm.dob}
                    onChangeText={(value) => setMemberForm((prev) => ({ ...prev, dob: value }))}
                    placeholder="1990-12-31"
                  />
                  <TextField
                    label="Blood Type"
                    value={memberForm.bloodType}
                    onChangeText={(value) => setMemberForm((prev) => ({ ...prev, bloodType: value }))}
                    placeholder="O+"
                  />
                  <TextField
                    label="Email"
                    value={memberForm.email}
                    onChangeText={(value) => setMemberForm((prev) => ({ ...prev, email: value }))}
                    placeholder="name@example.com"
                  />
                  <TextField
                    label="Mobile Number"
                    value={memberForm.mobileNumber}
                    onChangeText={(value) => setMemberForm((prev) => ({ ...prev, mobileNumber: value }))}
                    placeholder="+62..."
                  />
                  <TextField
                    label="Address"
                    value={memberForm.address}
                    onChangeText={(value) => setMemberForm((prev) => ({ ...prev, address: value }))}
                    placeholder="Street, city"
                  />
                  <View style={styles.inlineRow}>
                    <Pressable
                      style={[styles.actionChip, memberForm.active && styles.actionChipActive]}
                      onPress={() => setMemberForm((prev) => ({ ...prev, active: !prev.active }))}
                    >
                      <Text style={[styles.actionChipText, memberForm.active && styles.actionChipTextActive]}>
                        {memberForm.active ? "Active" : "Inactive"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.actionPrimary} onPress={() => void saveMember()} disabled={memberSaving}>
                      <Text style={styles.actionPrimaryText}>
                        {memberSaving ? "Saving..." : editingMemberId ? "Update" : "Create"}
                      </Text>
                    </Pressable>
                    {editingMemberId ? (
                      <Pressable style={styles.actionSecondary} onPress={resetMemberForm}>
                        <Text style={styles.actionSecondaryText}>Cancel</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>

                <Card>
                  <Text style={styles.sectionTitle}>Members ({members.length})</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      value={membersQuery}
                      onChangeText={setMembersQuery}
                      placeholder="Search by name or code"
                      placeholderTextColor="#7a879a"
                      style={styles.searchInput}
                      returnKeyType="search"
                      onSubmitEditing={() => void runMemberSearch()}
                    />
                    <Pressable style={styles.searchButton} onPress={() => void runMemberSearch()}>
                      <Text style={styles.searchButtonText}>Search</Text>
                    </Pressable>
                  </View>
                </Card>
              </>
            }
            ListEmptyComponent={<Text style={styles.meta}>No members found.</Text>}
            renderItem={({ item }) => (
              <View style={styles.rowItem}>
                <Text style={styles.titleStrong}>{item.fullName}</Text>
                <Text style={styles.meta}>Code: {item.memberCode}</Text>
                <Text style={styles.meta}>Status: {item.active ? "Active" : "Inactive"}</Text>
                <View style={styles.memberActions}>
                  <Pressable style={styles.actionSecondary} onPress={() => startEditMember(item)}>
                    <Text style={styles.actionSecondaryText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionSecondary} onPress={() => void toggleMemberActive(item)} disabled={memberSaving}>
                    <Text style={styles.actionSecondaryText}>{item.active ? "Deactivate" : "Activate"}</Text>
                  </Pressable>
                  <Pressable style={styles.actionDanger} onPress={() => void deleteMember(item)} disabled={memberSaving}>
                    <Text style={styles.actionDangerText}>Delete</Text>
                  </Pressable>
                </View>
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
  inlineRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  actionChip: {
    borderWidth: 1,
    borderColor: "#b8cbe8",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    minHeight: 40,
    minWidth: 90,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionChipActive: {
    borderColor: "#a4dfc1",
    backgroundColor: "#d4f6e4",
  },
  actionChipText: {
    color: "#2e476c",
    fontWeight: "700",
  },
  actionChipTextActive: {
    color: "#0e4f31",
  },
  memberActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionPrimary: {
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 10,
    backgroundColor: theme.primary,
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  actionSecondary: {
    borderWidth: 1,
    borderColor: "#b8cbe8",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    minHeight: 40,
    minWidth: 86,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSecondaryText: {
    color: "#2e476c",
    fontWeight: "700",
  },
  actionDanger: {
    borderWidth: 1,
    borderColor: "#f0bebe",
    borderRadius: 10,
    backgroundColor: "#fff1f1",
    minHeight: 40,
    minWidth: 86,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDangerText: {
    color: "#9d2424",
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
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
  actionsBar: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#d6e2f3",
    paddingTop: 10,
    paddingBottom: 4,
  },
});

import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { ListSkeleton } from "../components/ListSkeleton";
import { Screen } from "../components/Screen";
import { StatusBanner } from "../components/StatusBanner";
import { TextField } from "../components/TextField";
import { formatDateTime } from "../lib/date";
import { theme } from "../lib/theme";
import { adminApi, type CreateMemberInput, type CreateSessionInput } from "../services/adminApi";
import type { AdminAuthUser, AdminMember, AdminSessionDashboard, AdminSessionListItem, AdminSessionState } from "../types/admin";

type AdminHomeScreenProps = {
  user: AdminAuthUser;
  view: "home" | "sessions" | "members";
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

type SessionFormState = {
  eventName: string;
  startsAtLocal: string;
  endsAtLocal: string;
  mandatory: boolean;
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

function defaultSessionForm(): SessionFormState {
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return {
    eventName: "",
    startsAtLocal: toLocalDateTimeInput(now.toISOString()),
    endsAtLocal: toLocalDateTimeInput(end.toISOString()),
    mandatory: true,
  };
}

function parseDate(value: string): number {
  return new Date(value).getTime();
}

function formatRate(value: number | undefined): string {
  if (value === undefined) {
    return "-";
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoFromLocalDateTimeInput(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date-time format. Use YYYY-MM-DDTHH:mm");
  }
  return parsed.toISOString();
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

export function AdminHomeScreen({ user, view }: AdminHomeScreenProps) {
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, AdminSessionDashboard>>({});
  const [sessionsQuery, setSessionsQuery] = useState("");
  const [membersQuery, setMembersQuery] = useState("");
  const [sessionForm, setSessionForm] = useState<SessionFormState>(defaultSessionForm);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sessionCreateOpen, setSessionCreateOpen] = useState(false);
  const [sessionListOpen, setSessionListOpen] = useState(false);
  const [memberCreateOpen, setMemberCreateOpen] = useState(false);
  const [memberListOpen, setMemberListOpen] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [expandedMemberIds, setExpandedMemberIds] = useState<Record<string, boolean>>({});
  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(null);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    setOpenSessionMenuId(null);
    setOpenMemberMenuId(null);
  }, [view]);

  const currentSession = useMemo(() => {
    const now = Date.now();
    return sessions.find((s) => parseDate(s.startsAt) <= now && parseDate(s.endsAt) >= now && s.status === "ACTIVE") || null;
  }, [sessions]);

  const incomingSessions = useMemo(
    () => sessions.filter((s) => parseDate(s.startsAt) > Date.now()).sort((a, b) => parseDate(a.startsAt) - parseDate(b.startsAt)).slice(0, 8),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    const query = sessionsQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((session) => `${session.eventName} ${session.status}`.toLowerCase().includes(query));
  }, [sessions, sessionsQuery]);

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

  async function refreshSessions() {
    const data = await adminApi.listSessions();
    setSessions(data);
  }

  async function refreshMembers(query = membersQuery) {
    const data = await adminApi.listMembers(query, true);
    setMembers(data);
  }

  function toggleSessionExpanded(sessionId: string) {
    setExpandedSessionIds((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  }

  function toggleMemberExpanded(memberId: string) {
    setExpandedMemberIds((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  }

  function resetSessionForm() {
    setEditingSessionId(null);
    setSessionForm(defaultSessionForm());
  }

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm(EMPTY_MEMBER_FORM);
  }

  function startEditSession(session: AdminSessionListItem | AdminSessionState) {
    setEditingSessionId(session.id);
    setSessionCreateOpen(true);
    setSessionForm({
      eventName: session.eventName,
      startsAtLocal: toLocalDateTimeInput(session.startsAt),
      endsAtLocal: toLocalDateTimeInput(session.endsAt),
      mandatory: session.mandatory,
    });
    setError("");
    setSuccess("");
  }

  function startEditMember(member: AdminMember) {
    setEditingMemberId(member.id);
    setMemberCreateOpen(true);
    setMemberForm(memberToForm(member));
    setError("");
    setSuccess("");
  }

  function sessionFormToInput(form: SessionFormState): CreateSessionInput {
    return {
      eventName: form.eventName.trim(),
      startsAt: toIsoFromLocalDateTimeInput(form.startsAtLocal),
      endsAt: toIsoFromLocalDateTimeInput(form.endsAtLocal),
      mandatory: form.mandatory,
    };
  }

  async function saveSession() {
    if (!sessionForm.eventName.trim() || !sessionForm.startsAtLocal || !sessionForm.endsAtLocal) {
      setError("Session event name, start time, and end time are required.");
      return;
    }
    let payload: CreateSessionInput;
    try {
      payload = sessionFormToInput(sessionForm);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid session date-time.");
      return;
    }
    if (new Date(payload.endsAt).getTime() <= new Date(payload.startsAt).getTime()) {
      setError("Session end time must be after start time.");
      return;
    }
    setSessionSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editingSessionId) {
        await adminApi.updateSession(editingSessionId, payload);
        setSuccess("Session updated.");
      } else {
        await adminApi.createSession(payload);
        setSuccess("Session created.");
      }
      resetSessionForm();
      await refreshSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setSessionSaving(false);
    }
  }

  async function startOrCloseSession(session: AdminSessionListItem) {
    const isActive = session.status === "ACTIVE";
    const ok = await confirmAction(`${isActive ? "Close" : "Start"} Session`, `Do you want to ${isActive ? "close" : "start"} "${session.eventName}"?`);
    if (!ok) {
      return;
    }
    setSessionSaving(true);
    setError("");
    setSuccess("");
    try {
      if (isActive) {
        await adminApi.closeSession(session.id);
      } else {
        await adminApi.startSession(session.id);
      }
      setSuccess(`Session ${isActive ? "closed" : "started"}.`);
      await refreshSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update session status");
    } finally {
      setSessionSaving(false);
    }
  }

  async function deleteSession(session: AdminSessionListItem) {
    const ok = await confirmAction("Delete Session", `Delete "${session.eventName}"? This action cannot be undone.`);
    if (!ok) {
      return;
    }
    setSessionSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteSession(session.id);
      if (editingSessionId === session.id) {
        resetSessionForm();
      }
      setSuccess("Session deleted.");
      await refreshSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setSessionSaving(false);
    }
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
    const ok = await confirmAction(`${nextActive ? "Activate" : "Deactivate"} Member`, `Do you want to ${nextActive ? "activate" : "deactivate"} ${member.fullName}?`);
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
      if (editingMemberId === member.id) {
        resetMemberForm();
      }
      setSuccess("Member deleted.");
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete member");
    } finally {
      setMemberSaving(false);
    }
  }

  if (view === "home") {
    return (
      <Screen title="Home" scroll={false}>
        {error ? <StatusBanner tone="error" message={error} /> : null}
        {success ? <StatusBanner tone="success" message={success} /> : null}
        <FlatList
          data={incomingSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <Card>
                <Text style={styles.sectionTitle}>Quick Summary</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryChip}><Text style={styles.summaryLabel}>Sessions</Text><Text style={styles.summaryValue}>{sessions.length}</Text></View>
                  <View style={styles.summaryChip}><Text style={styles.summaryLabel}>Members</Text><Text style={styles.summaryValue}>{members.length}</Text></View>
                  <View style={styles.summaryChip}><Text style={styles.summaryLabel}>Active Now</Text><Text style={styles.summaryValue}>{currentSession ? 1 : 0}</Text></View>
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
      </Screen>
    );
  }

  if (view === "sessions") {
    return (
      <Screen title="Sessions" scroll={false}>
        {error ? <StatusBanner tone="error" message={error} /> : null}
        {success ? <StatusBanner tone="success" message={success} /> : null}
        {loading ? <ListSkeleton rows={8} /> : null}
        <FlatList
          data={sessionListOpen ? filteredSessions : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <Card>
                <Pressable style={styles.accordionHead} onPress={() => setSessionCreateOpen((prev) => !prev)}>
                  <Text style={styles.sectionTitle}>{sessionCreateOpen ? "Hide Create Session" : "Create Session"}</Text>
                  <Text style={styles.accordionIcon}>{sessionCreateOpen ? "-" : "+"}</Text>
                </Pressable>
                {sessionCreateOpen ? (
                  <View>
                    <TextField label="Event Name" value={sessionForm.eventName} onChangeText={(value) => setSessionForm((prev) => ({ ...prev, eventName: value }))} placeholder="Sunday Service" />
                    <TextField label="Starts At (YYYY-MM-DDTHH:mm)" value={sessionForm.startsAtLocal} onChangeText={(value) => setSessionForm((prev) => ({ ...prev, startsAtLocal: value }))} placeholder="2026-03-07T09:00" />
                    <TextField label="Ends At (YYYY-MM-DDTHH:mm)" value={sessionForm.endsAtLocal} onChangeText={(value) => setSessionForm((prev) => ({ ...prev, endsAtLocal: value }))} placeholder="2026-03-07T11:00" />
                    <View style={styles.inlineRow}>
                      <Pressable style={[styles.actionChip, sessionForm.mandatory && styles.actionChipActive]} onPress={() => setSessionForm((prev) => ({ ...prev, mandatory: !prev.mandatory }))}>
                        <Text style={[styles.actionChipText, sessionForm.mandatory && styles.actionChipTextActive]}>{sessionForm.mandatory ? "Mandatory" : "Optional"}</Text>
                      </Pressable>
                      <Pressable style={styles.actionPrimary} onPress={() => void saveSession()} disabled={sessionSaving}>
                        <Text style={styles.actionPrimaryText}>{sessionSaving ? "Saving..." : editingSessionId ? "Update" : "Create"}</Text>
                      </Pressable>
                      {editingSessionId ? <Pressable style={styles.actionSecondary} onPress={resetSessionForm}><Text style={styles.actionSecondaryText}>Cancel</Text></Pressable> : null}
                    </View>
                  </View>
                ) : null}
              </Card>
              <Card>
                <Pressable style={styles.accordionHead} onPress={() => setSessionListOpen((prev) => !prev)}>
                  <Text style={styles.sectionTitle}>{sessionListOpen ? "Hide All Sessions" : "All Sessions"}</Text>
                  <Text style={styles.accordionIcon}>{sessionListOpen ? "-" : "+"}</Text>
                </Pressable>
                {sessionListOpen ? (
                  <View style={styles.searchRow}>
                    <TextInput value={sessionsQuery} onChangeText={setSessionsQuery} placeholder="Search by event or status" placeholderTextColor="#7a879a" style={styles.searchInput} />
                  </View>
                ) : null}
              </Card>
            </>
          }
          ListEmptyComponent={sessionListOpen ? <Text style={styles.meta}>No sessions found.</Text> : null}
          renderItem={({ item }) => (
            <View style={styles.rowItem}>
              <View style={styles.rowHead}>
                <Pressable style={styles.rowMain} onPress={() => toggleSessionExpanded(item.id)}>
                  <Text style={styles.titleStrong}>{item.eventName}</Text>
                  <Text style={styles.rowSubtitle}>{formatDateTime(item.startsAt)} - {formatDateTime(item.endsAt)}</Text>
                </Pressable>
                <View style={styles.rowActionsTop}>
                  <View style={[styles.rowBadge, item.status === "ACTIVE" ? styles.badgeActive : styles.badgeNeutral]}>
                    <Text style={[styles.rowBadgeText, item.status === "ACTIVE" ? styles.badgeActiveText : styles.badgeNeutralText]}>{item.status}</Text>
                  </View>
                  <Pressable style={styles.moreButton} onPress={() => setOpenSessionMenuId((prev) => (prev === item.id ? null : item.id))}><Text style={styles.moreButtonText}>...</Text></Pressable>
                  {openSessionMenuId === item.id ? (
                    <View style={styles.menuPanel}>
                      <Pressable style={styles.menuItem} onPress={() => { toggleSessionExpanded(item.id); setOpenSessionMenuId(null); }}><Text style={styles.menuItemText}>{expandedSessionIds[item.id] ? "Hide Details" : "Show Details"}</Text></Pressable>
                      <Pressable style={styles.menuItem} onPress={() => { startEditSession(item); setOpenSessionMenuId(null); }}><Text style={styles.menuItemText}>Edit</Text></Pressable>
                      {item.status !== "CLOSED" ? <Pressable style={styles.menuItem} onPress={() => { void startOrCloseSession(item); setOpenSessionMenuId(null); }} disabled={sessionSaving}><Text style={styles.menuItemText}>{item.status === "ACTIVE" ? "Close Session" : "Start Session"}</Text></Pressable> : null}
                      <Pressable style={styles.menuItem} onPress={() => { void deleteSession(item); setOpenSessionMenuId(null); }} disabled={sessionSaving}><Text style={styles.menuItemDanger}>Delete</Text></Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
              {expandedSessionIds[item.id] ? (
                <View style={styles.expandBody}>
                  <Text style={styles.meta}>Type: {item.mandatory ? "Mandatory" : "Optional"}</Text>
                  <Text style={styles.meta}>Session ID: {item.id}</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Members" scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="success" message={success} /> : null}
      {loading ? <ListSkeleton rows={8} /> : null}
      <FlatList
        data={memberListOpen ? members : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Card>
              <Pressable style={styles.accordionHead} onPress={() => setMemberCreateOpen((prev) => !prev)}>
                <Text style={styles.sectionTitle}>{memberCreateOpen ? "Hide Create Member" : "Create Member"}</Text>
                <Text style={styles.accordionIcon}>{memberCreateOpen ? "-" : "+"}</Text>
              </Pressable>
              {memberCreateOpen ? (
                <View>
                  <TextField label="Full Name" value={memberForm.fullName} onChangeText={(value) => setMemberForm((prev) => ({ ...prev, fullName: value }))} placeholder="e.g. John Doe" />
                  <TextField label="Date of Birth (YYYY-MM-DD)" value={memberForm.dob} onChangeText={(value) => setMemberForm((prev) => ({ ...prev, dob: value }))} placeholder="1990-12-31" />
                  <TextField label="Blood Type" value={memberForm.bloodType} onChangeText={(value) => setMemberForm((prev) => ({ ...prev, bloodType: value }))} placeholder="O+" />
                  <TextField label="Email" value={memberForm.email} onChangeText={(value) => setMemberForm((prev) => ({ ...prev, email: value }))} placeholder="name@example.com" />
                  <TextField label="Mobile Number" value={memberForm.mobileNumber} onChangeText={(value) => setMemberForm((prev) => ({ ...prev, mobileNumber: value }))} placeholder="+62..." />
                  <TextField label="Address" value={memberForm.address} onChangeText={(value) => setMemberForm((prev) => ({ ...prev, address: value }))} placeholder="Street, city" />
                  <View style={styles.inlineRow}>
                    <Pressable style={[styles.actionChip, memberForm.active && styles.actionChipActive]} onPress={() => setMemberForm((prev) => ({ ...prev, active: !prev.active }))}>
                      <Text style={[styles.actionChipText, memberForm.active && styles.actionChipTextActive]}>{memberForm.active ? "Active" : "Inactive"}</Text>
                    </Pressable>
                    <Pressable style={styles.actionPrimary} onPress={() => void saveMember()} disabled={memberSaving}>
                      <Text style={styles.actionPrimaryText}>{memberSaving ? "Saving..." : editingMemberId ? "Update" : "Create"}</Text>
                    </Pressable>
                    {editingMemberId ? <Pressable style={styles.actionSecondary} onPress={resetMemberForm}><Text style={styles.actionSecondaryText}>Cancel</Text></Pressable> : null}
                  </View>
                </View>
              ) : null}
            </Card>
            <Card>
              <Pressable style={styles.accordionHead} onPress={() => setMemberListOpen((prev) => !prev)}>
                <Text style={styles.sectionTitle}>{memberListOpen ? "Hide All Members" : "All Members"}</Text>
                <Text style={styles.accordionIcon}>{memberListOpen ? "-" : "+"}</Text>
              </Pressable>
              {memberListOpen ? (
                <View style={styles.searchRow}>
                  <TextInput value={membersQuery} onChangeText={setMembersQuery} placeholder="Search by name or code" placeholderTextColor="#7a879a" style={styles.searchInput} returnKeyType="search" onSubmitEditing={() => void refreshMembers(membersQuery)} />
                  <Pressable style={styles.searchButton} onPress={() => void refreshMembers(membersQuery)}><Text style={styles.searchButtonText}>Search</Text></Pressable>
                </View>
              ) : null}
            </Card>
          </>
        }
        ListEmptyComponent={memberListOpen ? <Text style={styles.meta}>No members found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.rowItem}>
            <View style={styles.rowHead}>
              <Pressable style={styles.rowMain} onPress={() => toggleMemberExpanded(item.id)}>
                <Text style={styles.titleStrong}>{item.fullName}</Text>
                <Text style={styles.rowSubtitle}>Code: {item.memberCode}</Text>
              </Pressable>
              <View style={styles.rowActionsTop}>
                <View style={[styles.rowBadge, item.active ? styles.badgeActive : styles.badgeNeutral]}>
                  <Text style={[styles.rowBadgeText, item.active ? styles.badgeActiveText : styles.badgeNeutralText]}>{item.active ? "ACTIVE" : "INACTIVE"}</Text>
                </View>
                <Pressable style={styles.moreButton} onPress={() => setOpenMemberMenuId((prev) => (prev === item.id ? null : item.id))}><Text style={styles.moreButtonText}>...</Text></Pressable>
                {openMemberMenuId === item.id ? (
                  <View style={styles.menuPanel}>
                    <Pressable style={styles.menuItem} onPress={() => { toggleMemberExpanded(item.id); setOpenMemberMenuId(null); }}><Text style={styles.menuItemText}>{expandedMemberIds[item.id] ? "Hide Details" : "Show Details"}</Text></Pressable>
                    <Pressable style={styles.menuItem} onPress={() => { startEditMember(item); setOpenMemberMenuId(null); }}><Text style={styles.menuItemText}>Edit</Text></Pressable>
                    <Pressable style={styles.menuItem} onPress={() => { void toggleMemberActive(item); setOpenMemberMenuId(null); }} disabled={memberSaving}><Text style={styles.menuItemText}>{item.active ? "Deactivate" : "Activate"}</Text></Pressable>
                    <Pressable style={styles.menuItem} onPress={() => { void deleteMember(item); setOpenMemberMenuId(null); }} disabled={memberSaving}><Text style={styles.menuItemDanger}>Delete</Text></Pressable>
                  </View>
                ) : null}
              </View>
            </View>
            {expandedMemberIds[item.id] ? (
              <View style={styles.expandBody}>
                <Text style={styles.meta}>Email: {item.email || "-"}</Text>
                <Text style={styles.meta}>Mobile: {item.mobileNumber || "-"}</Text>
                <Text style={styles.meta}>Blood: {item.bloodType || "-"}</Text>
                <Text style={styles.meta}>DOB: {item.dob || "-"}</Text>
                <Text style={styles.meta}>Address: {item.address || "-"}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 12 },
  sectionTitle: { color: theme.ink, fontSize: 18, fontWeight: "800", marginBottom: 6 },
  titleStrong: { color: "#183a72", fontSize: 16, fontWeight: "800" },
  meta: { color: "#304056", fontSize: 13, fontWeight: "600", marginTop: 2 },
  accordionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accordionIcon: { color: "#35517a", fontSize: 20, fontWeight: "800", marginTop: -4 },
  rowItem: { borderWidth: 1, borderColor: "#d5e1f4", borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: "#f5f9ff" },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  rowMain: { flex: 1 },
  rowSubtitle: { color: "#4e6384", fontSize: 12, marginTop: 2, fontWeight: "600" },
  rowActionsTop: { alignItems: "flex-end", position: "relative" },
  rowBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  rowBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  badgeActive: { backgroundColor: "#d4f6e4", borderWidth: 1, borderColor: "#a4dfc1" },
  badgeActiveText: { color: "#0e4f31" },
  badgeNeutral: { backgroundColor: "#eef2f8", borderWidth: 1, borderColor: "#ccd8ea" },
  badgeNeutralText: { color: "#3f5475" },
  moreButton: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "#c7d7f2", backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  moreButtonText: { color: "#2e476c", fontWeight: "900", marginTop: -4, fontSize: 18, lineHeight: 18 },
  menuPanel: { position: "absolute", top: 34, right: 0, width: 150, borderWidth: 1, borderColor: "#d2dff2", borderRadius: 10, backgroundColor: "#ffffff", zIndex: 50, overflow: "hidden", shadowColor: "#0b2449", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  menuItem: { paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#edf2fb" },
  menuItemText: { color: "#2e476c", fontSize: 12, fontWeight: "700" },
  menuItemDanger: { color: "#9d2424", fontSize: 12, fontWeight: "700" },
  expandBody: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#dbe5f4" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryChip: { flex: 1, borderWidth: 1, borderColor: "#d2dff2", borderRadius: 10, padding: 8, backgroundColor: "#f8fbff" },
  summaryLabel: { color: "#4a6185", fontSize: 11, fontWeight: "700" },
  summaryValue: { marginTop: 3, color: "#143562", fontSize: 18, fontWeight: "800" },
  inlineRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" },
  actionChip: { borderWidth: 1, borderColor: "#b8cbe8", borderRadius: 10, backgroundColor: "#ffffff", minHeight: 40, minWidth: 90, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  actionChipActive: { borderColor: "#a4dfc1", backgroundColor: "#d4f6e4" },
  actionChipText: { color: "#2e476c", fontWeight: "700" },
  actionChipTextActive: { color: "#0e4f31" },
  actionPrimary: { borderWidth: 1, borderColor: theme.primary, borderRadius: 10, backgroundColor: theme.primary, minHeight: 40, minWidth: 92, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  actionPrimaryText: { color: "#ffffff", fontWeight: "700" },
  actionSecondary: { borderWidth: 1, borderColor: "#b8cbe8", borderRadius: 10, backgroundColor: "#ffffff", minHeight: 40, minWidth: 86, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  actionSecondaryText: { color: "#2e476c", fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchInput: { flex: 1, borderWidth: 1, borderColor: "#a8b8d3", borderRadius: 10, backgroundColor: "#fff", color: theme.ink, paddingVertical: 10, paddingHorizontal: 10, fontSize: 14 },
  searchButton: { minHeight: 40, minWidth: 72, borderRadius: 10, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  searchButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});

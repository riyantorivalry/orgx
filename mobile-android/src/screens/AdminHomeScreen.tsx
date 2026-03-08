import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  view: "home" | "sessions" | "members" | "profile";
  onLogout: () => Promise<void>;
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

function dateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeShort(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  resolve: (value: boolean) => void;
};

export function AdminHomeScreen({ user, view, onLogout }: AdminHomeScreenProps) {
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    setOpenSessionMenuId(null);
    setOpenMemberMenuId(null);
  }, [view]);

  const currentActiveSessions = useMemo(() => {
    const now = Date.now();
    return sessions.filter((s) => parseDate(s.startsAt) <= now && parseDate(s.endsAt) >= now && s.status === "ACTIVE");
  }, [sessions]);

  const incomingSessions = useMemo(
    () => sessions.filter((s) => parseDate(s.startsAt) > Date.now()).sort((a, b) => parseDate(a.startsAt) - parseDate(b.startsAt)).slice(0, 8),
    [sessions],
  );

  const groupedIncomingSessions = useMemo(() => {
    const map = new Map<string, { label: string; items: AdminSessionListItem[] }>();
    incomingSessions.forEach((session) => {
      const key = dateKey(session.startsAt);
      if (!map.has(key)) {
        map.set(key, { label: dateLabel(session.startsAt), items: [] });
      }
      map.get(key)?.items.push(session);
    });
    return Array.from(map.entries()).map(([key, value]) => {
      const starts = value.items.map((s) => parseDate(s.startsAt));
      const ends = value.items.map((s) => parseDate(s.endsAt));
      return {
        key,
        label: value.label,
        timeStart: new Date(Math.min(...starts)).toISOString(),
        timeEnd: new Date(Math.max(...ends)).toISOString(),
        items: value.items,
      };
    });
  }, [incomingSessions]);

  const groupedCurrentSessions = useMemo(() => {
    const map = new Map<string, { label: string; items: AdminSessionListItem[] }>();
    currentActiveSessions.forEach((session) => {
      const key = dateKey(session.startsAt);
      if (!map.has(key)) {
        map.set(key, { label: dateLabel(session.startsAt), items: [] });
      }
      map.get(key)?.items.push(session);
    });
    return Array.from(map.entries()).map(([key, value]) => {
      const starts = value.items.map((s) => parseDate(s.startsAt));
      const ends = value.items.map((s) => parseDate(s.endsAt));
      return {
        key,
        label: value.label,
        timeStart: new Date(Math.min(...starts)).toISOString(),
        timeEnd: new Date(Math.max(...ends)).toISOString(),
        items: value.items,
      };
    });
  }, [currentActiveSessions]);

  const filteredSessions = useMemo(() => {
    const query = sessionsQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((session) => `${session.eventName} ${session.status}`.toLowerCase().includes(query));
  }, [sessions, sessionsQuery]);

  const groupedFilteredSessions = useMemo(() => {
    const map = new Map<string, { label: string; items: AdminSessionListItem[] }>();
    filteredSessions.forEach((session) => {
      const key = dateKey(session.startsAt);
      if (!map.has(key)) {
        map.set(key, { label: dateLabel(session.startsAt), items: [] });
      }
      map.get(key)?.items.push(session);
    });
    return Array.from(map.entries()).map(([key, value]) => {
      const starts = value.items.map((s) => parseDate(s.startsAt));
      const ends = value.items.map((s) => parseDate(s.endsAt));
      return {
        key,
        label: value.label,
        timeStart: new Date(Math.min(...starts)).toISOString(),
        timeEnd: new Date(Math.max(...ends)).toISOString(),
        items: value.items,
      };
    });
  }, [filteredSessions]);

  function closeAllMenus() {
    setOpenSessionMenuId(null);
    setOpenMemberMenuId(null);
  }

  function openConfirm(options: Omit<ConfirmDialogState, "resolve">): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmDialog({ ...options, resolve });
    });
  }

  function closeConfirm(result: boolean) {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  }

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
    const ok = await openConfirm({
      title: `${isActive ? "Close" : "Start"} Session`,
      message: `Do you want to ${isActive ? "close" : "start"} "${session.eventName}"?`,
      confirmLabel: isActive ? "Close Session" : "Start Session",
      tone: isActive ? "danger" : "primary",
    });
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
    const ok = await openConfirm({
      title: "Delete Session",
      message: `Delete "${session.eventName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
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
    const ok = await openConfirm({
      title: `${nextActive ? "Activate" : "Deactivate"} Member`,
      message: `Do you want to ${nextActive ? "activate" : "deactivate"} ${member.fullName}?`,
      confirmLabel: nextActive ? "Activate" : "Deactivate",
      tone: nextActive ? "primary" : "danger",
    });
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
    const ok = await openConfirm({
      title: "Delete Member",
      message: `Delete ${member.fullName}? This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
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

  const confirmDialogNode = confirmDialog ? (
    <Modal transparent visible animationType="fade" onRequestClose={() => closeConfirm(false)}>
      <Pressable style={styles.dialogBackdrop} onPress={() => closeConfirm(false)}>
        <Pressable style={styles.dialogCard} onPress={() => undefined}>
          <View style={styles.dialogIconWrap}>
            <MaterialCommunityIcons
              name={confirmDialog.tone === "danger" ? "alert-circle-outline" : "help-circle-outline"}
              size={24}
              style={[styles.dialogIcon, confirmDialog.tone === "danger" ? styles.dialogIconDanger : styles.dialogIconPrimary]}
            />
          </View>
          <Text style={styles.dialogTitle}>{confirmDialog.title}</Text>
          <Text style={styles.dialogMessage}>{confirmDialog.message}</Text>
          <View style={styles.dialogActions}>
            <Pressable style={styles.dialogCancelButton} onPress={() => closeConfirm(false)}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.dialogConfirmButton, confirmDialog.tone === "danger" ? styles.dialogConfirmDanger : styles.dialogConfirmPrimary]}
              onPress={() => closeConfirm(true)}
            >
              <Text style={styles.dialogConfirmText}>{confirmDialog.confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  ) : null;

  if (view === "home") {
    return (
      <Screen title="Home" scroll={false}>
        {error ? <StatusBanner tone="error" message={error} /> : null}
        {success ? <StatusBanner tone="success" message={success} /> : null}
        <FlatList
          data={[]}
          keyExtractor={(_, index) => `home-${index}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <Card>
                <View style={styles.titleWithIcon}><MaterialCommunityIcons name="view-dashboard-outline" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>Quick Summary</Text></View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryChip}>
                    <MaterialCommunityIcons name="calendar-multiple" size={16} style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Sessions</Text>
                    <Text style={styles.summaryValue}>{sessions.length}</Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <MaterialCommunityIcons name="account-group-outline" size={16} style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Members</Text>
                    <Text style={styles.summaryValue}>{members.length}</Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <MaterialCommunityIcons name="play-circle-outline" size={16} style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Active Now</Text>
                    <Text style={styles.summaryValue}>{currentActiveSessions.length}</Text>
                  </View>
                </View>
              </Card>
              <Card>
                <View style={styles.titleWithIcon}><MaterialCommunityIcons name="clock-outline" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>Current Session</Text></View>
                {!groupedCurrentSessions.length ? <Text style={styles.metaMuted}>No active session right now.</Text> : null}
                {groupedCurrentSessions.map((group) => (
                  <View key={group.key} style={styles.currentSessionPanel}>
                    <View style={styles.incomingHead}>
                      <Text style={styles.currentSessionTitle}>{group.label}</Text>
                      <Text style={styles.currentSessionTime}>{timeShort(group.timeStart)} - {timeShort(group.timeEnd)}</Text>
                    </View>
                    {group.items.map((item) => (
                      <View key={item.id} style={styles.incomingRow}>
                        <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                        <Text style={styles.incomingEvent}>{item.eventName}</Text>
                      </View>
                    ))}
                    <View style={styles.currentSessionMetrics}>
                      <View style={styles.currentSessionMetricCard}>
                        <Text style={styles.currentSessionMetricLabel}>Check-ins</Text>
                        <Text style={styles.currentSessionMetricValue}>
                          {group.items.reduce((sum, item) => sum + (sessionMetrics[item.id]?.totalCheckIns ?? 0), 0)}
                        </Text>
                      </View>
                      <View style={styles.currentSessionMetricCard}>
                        <Text style={styles.currentSessionMetricLabel}>Rate</Text>
                        <Text style={styles.currentSessionMetricValue}>
                          {formatRate(group.items.reduce((sum, item) => sum + (sessionMetrics[item.id]?.checkInRatePercent ?? 0), 0) / Math.max(1, group.items.length))}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
              <Card>
                <View style={styles.titleWithIcon}><MaterialCommunityIcons name="calendar-arrow-right" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>Incoming Sessions</Text></View>
                {!groupedIncomingSessions.length ? <Text style={styles.metaMuted}>No incoming session scheduled.</Text> : null}
                {groupedIncomingSessions.map((group) => (
                  <View key={group.key} style={styles.incomingItem}>
                    <View style={styles.incomingHead}>
                      <Text style={styles.incomingTitle}>{group.label}</Text>
                      <Text style={styles.incomingRange}>{timeShort(group.timeStart)} - {timeShort(group.timeEnd)}</Text>
                    </View>
                    {group.items.map((item) => (
                      <View key={item.id} style={styles.incomingRow}>
                        <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                        <Text style={styles.incomingEvent}>{item.eventName}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </Card>
            </>
          }
          ListEmptyComponent={null}
          renderItem={() => null}
        />
        {confirmDialogNode}
      </Screen>
    );
  }

  if (view === "sessions") {
    return (
      <Screen title="Sessions" scroll={false}>
        {error ? <StatusBanner tone="error" message={error} /> : null}
        {success ? <StatusBanner tone="success" message={success} /> : null}
        {loading ? <ListSkeleton rows={8} /> : null}
        <View style={styles.interactionLayer}>
          <FlatList
            data={sessionListOpen ? groupedFilteredSessions : []}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={closeAllMenus}
            removeClippedSubviews={false}
            ListHeaderComponent={
            <>
              <Card>
                <Pressable style={styles.accordionHead} onPress={() => setSessionCreateOpen((prev) => !prev)}>
                  <View style={styles.titleWithIcon}><MaterialCommunityIcons name="calendar-plus" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>{sessionCreateOpen ? "Hide Create Session" : "Create Session"}</Text></View>
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
                  <View style={styles.titleWithIcon}><MaterialCommunityIcons name="calendar-multiple" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>{sessionListOpen ? "Hide All Sessions" : "All Sessions"}</Text></View>
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
            renderItem={({ item: group }) => (
              <View style={styles.incomingItem}>
                <View style={styles.incomingHead}>
                  <Text style={styles.incomingTitle}>{group.label}</Text>
                  <Text style={styles.incomingRange}>{timeShort(group.timeStart)} - {timeShort(group.timeEnd)}</Text>
                </View>
                {group.items.map((item) => (
                  <View key={item.id} style={[styles.rowItem, openSessionMenuId === item.id && styles.rowItemOverlay]}>
                    <View style={styles.rowHead}>
                      <Pressable style={styles.rowMain} onPress={() => toggleSessionExpanded(item.id)}>
                        <Text style={styles.titleStrong}>{item.eventName}</Text>
                        <View style={styles.rowSubtitleWithIcon}>
                          <MaterialCommunityIcons name="clock-outline" size={14} style={styles.rowMetaIcon} />
                          <Text style={styles.rowSubtitleText}>{timeShort(item.startsAt)} - {timeShort(item.endsAt)}</Text>
                        </View>
                      </Pressable>
                      <View style={styles.rowActionsTop}>
                        <View style={[styles.typeDot, item.mandatory ? styles.typeDotMandatory : styles.typeDotOptional]} />
                        <Pressable style={styles.moreButton} onPress={() => setOpenSessionMenuId((prev) => (prev === item.id ? null : item.id))}><Text style={styles.moreButtonText}>...</Text></Pressable>
                      </View>
                    </View>
                    {openSessionMenuId === item.id ? (
                      <View style={styles.menuPanelInline}>
                        <Pressable style={styles.menuItem} onPress={() => { toggleSessionExpanded(item.id); setOpenSessionMenuId(null); }}><View style={styles.menuItemRow}><MaterialCommunityIcons name={expandedSessionIds[item.id] ? "chevron-up" : "chevron-down"} size={14} style={styles.menuIcon} /><Text style={styles.menuItemText}>{expandedSessionIds[item.id] ? "Hide Details" : "Show Details"}</Text></View></Pressable>
                        <Pressable style={styles.menuItem} onPress={() => { startEditSession(item); setOpenSessionMenuId(null); }}><View style={styles.menuItemRow}><MaterialCommunityIcons name="pencil-outline" size={14} style={styles.menuIcon} /><Text style={styles.menuItemText}>Edit</Text></View></Pressable>
                        {item.status !== "CLOSED" ? <Pressable style={styles.menuItem} onPress={() => { void startOrCloseSession(item); setOpenSessionMenuId(null); }} disabled={sessionSaving}><View style={styles.menuItemRow}><MaterialCommunityIcons name={item.status === "ACTIVE" ? "stop-circle-outline" : "play-circle-outline"} size={14} style={styles.menuIcon} /><Text style={styles.menuItemText}>{item.status === "ACTIVE" ? "Close Session" : "Start Session"}</Text></View></Pressable> : null}
                        <Pressable style={styles.menuItem} onPress={() => { void deleteSession(item); setOpenSessionMenuId(null); }} disabled={sessionSaving}><View style={styles.menuItemRow}><MaterialCommunityIcons name="delete-outline" size={14} style={styles.menuIconDanger} /><Text style={styles.menuItemDanger}>Delete</Text></View></Pressable>
                      </View>
                    ) : null}
                    {expandedSessionIds[item.id] ? (
                      <View style={styles.expandBody}>
                        <Text style={styles.meta}>Session ID: {item.id}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          />
        </View>
        {confirmDialogNode}
      </Screen>
    );
  }

  if (view === "profile") {
    return (
      <Screen title="Profile" scroll={false}>
        {error ? <StatusBanner tone="error" message={error} /> : null}
        {success ? <StatusBanner tone="success" message={success} /> : null}
        <Card>
          <View style={styles.titleWithIcon}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Admin Account</Text>
          </View>
          <Text style={styles.metaStrong}>Username: {user.username}</Text>
          <Text style={styles.meta}>Role: Administrator</Text>
          <Text style={styles.metaMuted}>Use this section to manage account actions.</Text>
        </Card>
        <Card>
          <Pressable style={styles.profileLogoutButton} onPress={() => void onLogout()}>
            <MaterialCommunityIcons name="logout" size={16} style={styles.profileLogoutIcon} />
            <Text style={styles.profileLogoutText}>Logout</Text>
          </Pressable>
        </Card>
        {confirmDialogNode}
      </Screen>
    );
  }

  return (
    <Screen title="Members" scroll={false}>
      {error ? <StatusBanner tone="error" message={error} /> : null}
      {success ? <StatusBanner tone="success" message={success} /> : null}
      {loading ? <ListSkeleton rows={8} /> : null}
      <View style={styles.interactionLayer}>
        <FlatList
          data={memberListOpen ? members : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={closeAllMenus}
          removeClippedSubviews={false}
          ListHeaderComponent={
          <>
            <Card>
              <Pressable style={styles.accordionHead} onPress={() => setMemberCreateOpen((prev) => !prev)}>
                <View style={styles.titleWithIcon}><MaterialCommunityIcons name="account-plus-outline" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>{memberCreateOpen ? "Hide Create Member" : "Create Member"}</Text></View>
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
                <View style={styles.titleWithIcon}><MaterialCommunityIcons name="account-group-outline" size={18} style={styles.sectionIcon} /><Text style={styles.sectionTitle}>{memberListOpen ? "Hide All Members" : "All Members"}</Text></View>
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
          <View style={[styles.rowItem, openMemberMenuId === item.id && styles.rowItemOverlay]}>
            <View style={styles.rowHead}>
              <Pressable style={styles.rowMain} onPress={() => toggleMemberExpanded(item.id)}>
                <Text style={styles.titleStrong}>{item.fullName}</Text>
                <View style={styles.rowSubtitleWithIcon}>
                  <MaterialCommunityIcons name="badge-account-horizontal-outline" size={14} style={styles.rowMetaIcon} />
                  <Text style={styles.rowSubtitleText}>Code: {item.memberCode}</Text>
                </View>
              </Pressable>
              <View style={styles.rowActionsTop}>
                <View style={[styles.rowBadge, item.active ? styles.badgeActive : styles.badgeNeutral]}>
                  <Text style={[styles.rowBadgeText, item.active ? styles.badgeActiveText : styles.badgeNeutralText]}>{item.active ? "ACTIVE" : "INACTIVE"}</Text>
                </View>
                <Pressable style={styles.moreButton} onPress={() => setOpenMemberMenuId((prev) => (prev === item.id ? null : item.id))}><Text style={styles.moreButtonText}>...</Text></Pressable>
              </View>
            </View>
            {openMemberMenuId === item.id ? (
              <View style={styles.menuPanelInline}>
                <Pressable style={styles.menuItem} onPress={() => { toggleMemberExpanded(item.id); setOpenMemberMenuId(null); }}><View style={styles.menuItemRow}><MaterialCommunityIcons name={expandedMemberIds[item.id] ? "chevron-up" : "chevron-down"} size={14} style={styles.menuIcon} /><Text style={styles.menuItemText}>{expandedMemberIds[item.id] ? "Hide Details" : "Show Details"}</Text></View></Pressable>
                <Pressable style={styles.menuItem} onPress={() => { startEditMember(item); setOpenMemberMenuId(null); }}><View style={styles.menuItemRow}><MaterialCommunityIcons name="pencil-outline" size={14} style={styles.menuIcon} /><Text style={styles.menuItemText}>Edit</Text></View></Pressable>
                <Pressable style={styles.menuItem} onPress={() => { void toggleMemberActive(item); setOpenMemberMenuId(null); }} disabled={memberSaving}><View style={styles.menuItemRow}><MaterialCommunityIcons name={item.active ? "account-off-outline" : "account-check-outline"} size={14} style={styles.menuIcon} /><Text style={styles.menuItemText}>{item.active ? "Deactivate" : "Activate"}</Text></View></Pressable>
                <Pressable style={styles.menuItem} onPress={() => { void deleteMember(item); setOpenMemberMenuId(null); }} disabled={memberSaving}><View style={styles.menuItemRow}><MaterialCommunityIcons name="delete-outline" size={14} style={styles.menuIconDanger} /><Text style={styles.menuItemDanger}>Delete</Text></View></Pressable>
              </View>
            ) : null}
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
      </View>
      {confirmDialogNode}
    </Screen>
  );
}

const styles = StyleSheet.create({
  interactionLayer: { flex: 1, position: "relative" },
  listContent: { paddingBottom: 12 },
  titleWithIcon: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionIcon: { color: "#2f4f7f" },
  sectionTitle: { color: "#122d54", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  titleStrong: { color: "#173764", fontSize: 16, fontWeight: "800" },
  meta: { color: "#375276", fontSize: 13, fontWeight: "600", marginTop: 2 },
  metaStrong: { color: "#223f65", fontSize: 13, fontWeight: "700", marginTop: 2 },
  metaMuted: { color: "#637795", fontSize: 13, fontWeight: "600", marginTop: 2 },
  accordionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accordionIcon: { color: "#35517a", fontSize: 20, fontWeight: "800", marginTop: -4 },
  rowItem: { borderWidth: 1, borderColor: "#d5e1f4", borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: "#f5f9ff" },
  rowItemOverlay: { zIndex: 120, elevation: 12, overflow: "visible" },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  rowMain: { flex: 1 },
  rowSubtitle: { color: "#4e6384", fontSize: 12, marginTop: 2, fontWeight: "600" },
  rowSubtitleWithIcon: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rowSubtitleText: { color: "#4e6384", fontSize: 12, fontWeight: "600" },
  rowMetaIcon: { color: "#5d7192" },
  rowActionsTop: { alignItems: "flex-end", position: "relative" },
  rowBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  rowBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  badgeActive: { backgroundColor: "#d4f6e4", borderWidth: 1, borderColor: "#a4dfc1" },
  badgeActiveText: { color: "#0e4f31" },
  badgeNeutral: { backgroundColor: "#eef2f8", borderWidth: 1, borderColor: "#ccd8ea" },
  badgeNeutralText: { color: "#3f5475" },
  moreButton: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "#c7d7f2", backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  moreButtonText: { color: "#2e476c", fontWeight: "900", marginTop: -4, fontSize: 18, lineHeight: 18 },
  menuPanelInline: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d2dff2",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#1a3c73",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  menuItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#edf2fb" },
  menuItemRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuIcon: { color: "#4f6384" },
  menuIconDanger: { color: "#9d2424" },
  menuItemText: { color: "#2a4468", fontSize: 12, fontWeight: "700" },
  menuItemDanger: { color: "#9d2424", fontSize: 12, fontWeight: "800" },
  expandBody: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#dbe5f4" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryChip: { flex: 1, borderWidth: 1, borderColor: "#d2dff2", borderRadius: 10, padding: 8, backgroundColor: "#f8fbff" },
  summaryIcon: { color: "#4b6791", marginBottom: 4 },
  summaryLabel: { color: "#5b7092", fontSize: 11, fontWeight: "700" },
  summaryValue: { marginTop: 3, color: "#12335f", fontSize: 18, fontWeight: "800" },
  inlineRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" },
  currentSessionPanel: {
    borderWidth: 1,
    borderColor: "#c6d9f5",
    borderRadius: 12,
    backgroundColor: "#f7fbff",
    padding: 10,
  },
  currentSessionTitle: {
    color: "#102d57",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  currentSessionTime: {
    marginTop: 4,
    color: "#2f4f78",
    fontSize: 13,
    fontWeight: "700",
  },
  currentSessionMetrics: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  currentSessionMetricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d2def2",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  currentSessionMetricLabel: {
    color: "#587095",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  currentSessionMetricValue: {
    marginTop: 3,
    color: "#143562",
    fontSize: 17,
    fontWeight: "900",
  },
  metricPill: { borderWidth: 1, borderColor: "#d1def2", borderRadius: 999, backgroundColor: "#f4f8ff", paddingHorizontal: 10, paddingVertical: 6 },
  metricPillLabel: { color: "#5b7092", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  metricPillValue: { color: "#12335f", fontSize: 13, fontWeight: "800", marginTop: 1 },
  incomingItem: { borderWidth: 1, borderColor: "#d7e3f5", borderRadius: 10, backgroundColor: "#f8fbff", padding: 10, marginTop: 8 },
  incomingTitle: { color: "#183a72", fontSize: 15, fontWeight: "800" },
  incomingHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  incomingRange: { color: "#2f4f78", fontSize: 12, fontWeight: "700" },
  incomingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  incomingEvent: { color: "#355070", fontSize: 13, fontWeight: "700" },
  typeDot: { width: 9, height: 9, borderRadius: 999 },
  typeDotMandatory: { backgroundColor: "#e2a93a" },
  typeDotOptional: { backgroundColor: "#43a26b" },
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
  profileLogoutButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#f0bebe",
    borderRadius: 10,
    backgroundColor: "#fff1f1",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  profileLogoutIcon: { color: "#9d2424" },
  profileLogoutText: { color: "#9d2424", fontWeight: "800", fontSize: 14 },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 26, 47, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c8d7ef",
    backgroundColor: "#ffffff",
    padding: 16,
  },
  dialogIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f7ff",
    marginBottom: 10,
  },
  dialogIcon: {
    color: "#35517a",
  },
  dialogIconPrimary: {
    color: "#1f4f9a",
  },
  dialogIconDanger: {
    color: "#b12f2f",
  },
  dialogTitle: {
    color: "#132f57",
    fontSize: 18,
    fontWeight: "800",
  },
  dialogMessage: {
    marginTop: 8,
    color: "#395474",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  dialogActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  dialogCancelButton: {
    minHeight: 40,
    minWidth: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c0d0e8",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  dialogCancelText: {
    color: "#2e476c",
    fontWeight: "700",
    fontSize: 13,
  },
  dialogConfirmButton: {
    minHeight: 40,
    minWidth: 110,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  dialogConfirmPrimary: {
    borderColor: "#1f4f9a",
    backgroundColor: "#1f4f9a",
  },
  dialogConfirmDanger: {
    borderColor: "#b12f2f",
    backgroundColor: "#b12f2f",
  },
  dialogConfirmText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
});

import { useEffect, useMemo, useState } from "react";
import type { AdminAuthUser, AdminSessionListItem } from "../types/admin";
import { AdminConfirmDialog } from "./admin-tabs/AdminConfirmDialog";
import { AdminHomeTab } from "./admin-tabs/AdminHomeTab";
import { AdminMembersTab } from "./admin-tabs/AdminMembersTab";
import { AdminProfileTab } from "./admin-tabs/AdminProfileTab";
import { AdminSessionsTab } from "./admin-tabs/AdminSessionsTab";
import { useConfirmDialog } from "./admin-tabs/hooks/useConfirmDialog";
import { useMembersAdmin } from "./admin-tabs/hooks/useMembersAdmin";
import { useSessionsAdmin } from "./admin-tabs/hooks/useSessionsAdmin";
import type { SessionGroup } from "./admin-tabs/types";

type AdminHomeScreenProps = {
  user: AdminAuthUser;
  view: "home" | "sessions" | "members" | "profile";
  onLogout: () => Promise<void>;
};

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

function groupSessionsByDate(sessions: AdminSessionListItem[]): SessionGroup[] {
  const map = new Map<string, { label: string; items: AdminSessionListItem[] }>();
  sessions.forEach((session) => {
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
}

export function AdminHomeScreen({ user, view, onLogout }: AdminHomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { dialog, openConfirm, closeConfirm } = useConfirmDialog();

  const sessionsAdmin = useSessionsAdmin({
    openConfirm,
    setError,
    setSuccess,
  });

  const membersAdmin = useMembersAdmin({
    openConfirm,
    setError,
    setSuccess,
  });

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    closeAllMenus();
  }, [view]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await Promise.all([sessionsAdmin.loadSessionsWithMetrics(), membersAdmin.refreshMembers("")]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  function closeAllMenus() {
    sessionsAdmin.clearSessionMenu();
    membersAdmin.clearMemberMenu();
  }

  function toggleSessionMenu(sessionId: string) {
    sessionsAdmin.toggleSessionMenu(sessionId);
    membersAdmin.clearMemberMenu();
  }

  function toggleMemberMenu(memberId: string) {
    membersAdmin.toggleMemberMenu(memberId);
    sessionsAdmin.clearSessionMenu();
  }

  const currentActiveSessions = useMemo(() => {
    const now = Date.now();
    return sessionsAdmin.sessions.filter((s) => parseDate(s.startsAt) <= now && parseDate(s.endsAt) >= now && s.status === "ACTIVE");
  }, [sessionsAdmin.sessions]);

  const incomingSessions = useMemo(
    () => sessionsAdmin.sessions.filter((s) => parseDate(s.startsAt) > Date.now()).sort((a, b) => parseDate(a.startsAt) - parseDate(b.startsAt)).slice(0, 8),
    [sessionsAdmin.sessions],
  );

  const groupedIncomingSessions = useMemo(() => groupSessionsByDate(incomingSessions), [incomingSessions]);
  const groupedCurrentSessions = useMemo(() => groupSessionsByDate(currentActiveSessions), [currentActiveSessions]);
  const groupedFilteredSessions = useMemo(() => groupSessionsByDate(sessionsAdmin.filteredSessions), [sessionsAdmin.filteredSessions]);

  if (view === "home") {
    return (
      <>
        <AdminHomeTab
          error={error}
          success={success}
          sessionsCount={sessionsAdmin.sessions.length}
          membersCount={membersAdmin.members.length}
          groupedCurrentSessions={groupedCurrentSessions}
          groupedIncomingSessions={groupedIncomingSessions}
          sessionMetrics={sessionsAdmin.sessionMetrics}
          formatRate={formatRate}
          timeShort={timeShort}
        />
        <AdminConfirmDialog dialog={dialog} onClose={closeConfirm} />
      </>
    );
  }

  if (view === "sessions") {
    return (
      <>
        <AdminSessionsTab
          error={error}
          success={success}
          loading={loading}
          sessionSaving={sessionsAdmin.sessionSaving}
          sessionCreateOpen={sessionsAdmin.sessionCreateOpen}
          sessionListOpen={sessionsAdmin.sessionListOpen}
          sessionsQuery={sessionsAdmin.sessionsQuery}
          groupedFilteredSessions={groupedFilteredSessions}
          sessionForm={sessionsAdmin.sessionForm}
          editingSessionId={sessionsAdmin.editingSessionId}
          expandedSessionIds={sessionsAdmin.expandedSessionIds}
          openSessionMenuId={sessionsAdmin.openSessionMenuId}
          onToggleSessionCreate={() => sessionsAdmin.setSessionCreateOpen((prev) => !prev)}
          onToggleSessionList={() => sessionsAdmin.setSessionListOpen((prev) => !prev)}
          onChangeSessionsQuery={sessionsAdmin.setSessionsQuery}
          onSessionFormChange={sessionsAdmin.setSessionForm}
          onSaveSession={sessionsAdmin.saveSession}
          onCancelSessionEdit={sessionsAdmin.resetSessionForm}
          onToggleSessionExpanded={sessionsAdmin.toggleSessionExpanded}
          onToggleSessionMenu={toggleSessionMenu}
          onStartEditSession={sessionsAdmin.startEditSession}
          onStartOrCloseSession={sessionsAdmin.startOrCloseSession}
          onDeleteSession={sessionsAdmin.deleteSession}
          onCloseMenus={closeAllMenus}
          timeShort={timeShort}
        />
        <AdminConfirmDialog dialog={dialog} onClose={closeConfirm} />
      </>
    );
  }

  if (view === "profile") {
    return (
      <>
        <AdminProfileTab username={user.username} error={error} success={success} onLogout={onLogout} />
        <AdminConfirmDialog dialog={dialog} onClose={closeConfirm} />
      </>
    );
  }

  return (
    <>
      <AdminMembersTab
        error={error}
        success={success}
        loading={loading}
        memberSaving={membersAdmin.memberSaving}
        memberCreateOpen={membersAdmin.memberCreateOpen}
        memberListOpen={membersAdmin.memberListOpen}
        members={membersAdmin.members}
        membersQuery={membersAdmin.membersQuery}
        memberForm={membersAdmin.memberForm}
        editingMemberId={membersAdmin.editingMemberId}
        expandedMemberIds={membersAdmin.expandedMemberIds}
        openMemberMenuId={membersAdmin.openMemberMenuId}
        onToggleMemberCreate={() => membersAdmin.setMemberCreateOpen((prev) => !prev)}
        onToggleMemberList={() => membersAdmin.setMemberListOpen((prev) => !prev)}
        onChangeMembersQuery={(value) => {
          membersAdmin.setMembersQuery(value);
          void membersAdmin.refreshMembers(value);
        }}
        onMemberFormChange={membersAdmin.setMemberForm}
        onSaveMember={membersAdmin.saveMember}
        onCancelMemberEdit={membersAdmin.resetMemberForm}
        onToggleMemberExpanded={membersAdmin.toggleMemberExpanded}
        onToggleMemberMenu={toggleMemberMenu}
        onStartEditMember={membersAdmin.startEditMember}
        onToggleMemberActive={membersAdmin.toggleMemberActive}
        onDeleteMember={membersAdmin.deleteMember}
        onCloseMenus={closeAllMenus}
      />
      <AdminConfirmDialog dialog={dialog} onClose={closeConfirm} />
    </>
  );
}

import { useMemo, useState } from "react";
import { adminApi, type CreateSessionInput } from "../../../services/adminApi";
import type { AdminSessionDashboard, AdminSessionListItem, AdminSessionState } from "../../../types/admin";
import type { SessionFormState } from "../types";

const EMPTY_SUCCESS = "";

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

function sessionFormToInput(form: SessionFormState): CreateSessionInput {
  return {
    eventName: form.eventName.trim(),
    startsAt: toIsoFromLocalDateTimeInput(form.startsAtLocal),
    endsAt: toIsoFromLocalDateTimeInput(form.endsAtLocal),
    mandatory: form.mandatory,
  };
}

type UseSessionsAdminOptions = {
  openConfirm: (options: { title: string; message: string; confirmLabel: string; tone: "primary" | "danger" }) => Promise<boolean>;
  setError: (value: string) => void;
  setSuccess: (value: string) => void;
};

export function useSessionsAdmin({ openConfirm, setError, setSuccess }: UseSessionsAdminOptions) {
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, AdminSessionDashboard>>({});
  const [sessionsQuery, setSessionsQuery] = useState("");
  const [sessionForm, setSessionForm] = useState<SessionFormState>(defaultSessionForm);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionCreateOpen, setSessionCreateOpen] = useState(false);
  const [sessionListOpen, setSessionListOpen] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    const query = sessionsQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((session) => `${session.eventName} ${session.status}`.toLowerCase().includes(query));
  }, [sessions, sessionsQuery]);

  async function loadSessionsWithMetrics() {
    const sessionData = await adminApi.listSessions();
    setSessions(sessionData);
    const metricIds = [sessionData[0]?.id, sessionData[1]?.id, sessionData[2]?.id].filter((id): id is string => Boolean(id));
    const metricResults = await Promise.allSettled(metricIds.map((id) => adminApi.getDashboard(id)));
    const next: Record<string, AdminSessionDashboard> = {};
    metricResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        next[metricIds[index]] = result.value;
      }
    });
    setSessionMetrics(next);
  }

  async function refreshSessions() {
    const data = await adminApi.listSessions();
    setSessions(data);
  }

  function clearSessionMenu() {
    setOpenSessionMenuId(null);
  }

  function toggleSessionExpanded(sessionId: string) {
    setExpandedSessionIds((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  }

  function toggleSessionMenu(sessionId: string) {
    setOpenSessionMenuId((prev) => (prev === sessionId ? null : sessionId));
  }

  function resetSessionForm() {
    setEditingSessionId(null);
    setSessionForm(defaultSessionForm());
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
    setSuccess(EMPTY_SUCCESS);
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
    setSuccess(EMPTY_SUCCESS);
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
    setSuccess(EMPTY_SUCCESS);
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
    setSuccess(EMPTY_SUCCESS);
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

  return {
    sessions,
    sessionMetrics,
    sessionsQuery,
    setSessionsQuery,
    sessionForm,
    setSessionForm,
    editingSessionId,
    sessionSaving,
    sessionCreateOpen,
    setSessionCreateOpen,
    sessionListOpen,
    setSessionListOpen,
    expandedSessionIds,
    openSessionMenuId,
    filteredSessions,
    loadSessionsWithMetrics,
    refreshSessions,
    clearSessionMenu,
    toggleSessionExpanded,
    toggleSessionMenu,
    resetSessionForm,
    startEditSession,
    saveSession,
    startOrCloseSession,
    deleteSession,
  };
}

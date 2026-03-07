import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import type { AdminSessionDashboard, AdminSessionListItem } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

function parseDate(value: string): number {
  return new Date(value).getTime();
}

function dateKeyLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeShort(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRate(value: number | undefined): string {
  if (value === undefined) {
    return "-";
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export function AdminDashboardPage() {
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, AdminSessionDashboard>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminApi.listSessions();
        if (active) {
          setSessions(data);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const currentSession = useMemo(() => {
    const now = Date.now();
    return sessions.find((session) => {
      const start = parseDate(session.startsAt);
      const end = parseDate(session.endsAt);
      return now >= start && now <= end && session.status === "ACTIVE";
    }) || null;
  }, [sessions]);

  const incomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((session) => parseDate(session.startsAt) > now)
      .sort((a, b) => parseDate(a.startsAt) - parseDate(b.startsAt))
      .slice(0, 3);
  }, [sessions]);

  useEffect(() => {
    const targetIds = Array.from(
      new Set([currentSession?.id, ...incomingSessions.map((session) => session.id)].filter((id): id is string => Boolean(id))),
    );
    if (!targetIds.length) {
      return;
    }
    let active = true;
    const run = async () => {
      const settled = await Promise.allSettled(targetIds.map(async (sessionId) => {
        const metrics = await adminApi.getDashboard(sessionId);
        return { sessionId, metrics };
      }));
      if (!active) {
        return;
      }
      setSessionMetrics((prev) => {
        const next = { ...prev };
        settled.forEach((result) => {
          if (result.status === "fulfilled") {
            next[result.value.sessionId] = result.value.metrics;
          }
        });
        return next;
      });
    };
    void run();
    return () => {
      active = false;
    };
  }, [currentSession, incomingSessions]);

  const calendarMonthLabel = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);
  const leadingBlanks = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const calendarCells = useMemo(
    () => Array.from({ length: leadingBlanks + daysInMonth }, (_, index) => {
      if (index < leadingBlanks) {
        return null;
      }
      return index - leadingBlanks + 1;
    }),
    [leadingBlanks, daysInMonth],
  );

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, AdminSessionListItem[]>();
    sessions.forEach((session) => {
      const key = dateKeyLocal(new Date(session.startsAt));
      const group = map.get(key);
      if (group) {
        group.push(session);
      } else {
        map.set(key, [session]);
      }
    });
    map.forEach((items) => items.sort((a, b) => parseDate(a.startsAt) - parseDate(b.startsAt)));
    return map;
  }, [sessions]);

  return (
    <main className="container" aria-busy={loading}>
      <header className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Attendance Platform</p>
          <h1>Operations Dashboard</h1>
          <p>Run sessions and track member attendance from one command center.</p>
        </div>
        <div className="dashboard-hero-time">
          <p>{now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <strong>{now.toLocaleTimeString()}</strong>
        </div>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      <section className="dashboard-top-grid">
        <article className="card spotlight-card spotlight-current">
          <h2>Current Session</h2>
          {!currentSession && <p>No active session right now.</p>}
          {currentSession && (
            <>
              <p className="spotlight-title">{currentSession.eventName}</p>
              <p>{formatDateTime(currentSession.startsAt)} - {formatDateTime(currentSession.endsAt)}</p>
              <div className="spotlight-metrics">
                <div className="spotlight-metric">
                  <span>Total Check-ins</span>
                  <strong>{sessionMetrics[currentSession.id]?.totalCheckIns ?? "-"}</strong>
                </div>
                <div className="spotlight-metric">
                  <span>Check-in Rate</span>
                  <strong>{formatRate(sessionMetrics[currentSession.id]?.checkInRatePercent)}</strong>
                </div>
              </div>
              <div className="spotlight-actions spotlight-actions-fixed">
                <a
                  className="spotlight-chip-link"
                  href={`/admin/monitor?sessionId=${currentSession.id}`}
                  title="Monitor"
                  aria-label="Monitor"
                >
                  MONITOR
                </a>
                <a
                  className="spotlight-chip-link"
                  href={`/admin/qr?sessionId=${currentSession.id}`}
                  title="QR"
                  aria-label="QR"
                >
                  QR
                </a>
              </div>
            </>
          )}
        </article>

        <article className="card spotlight-card spotlight-incoming">
          <h2>Incoming Sessions</h2>
          {!incomingSessions.length && <p>No incoming session scheduled.</p>}
          {incomingSessions.map((incomingSession) => (
            <div key={incomingSession.id} className="incoming-item">
              <p className="spotlight-title">{incomingSession.eventName}</p>
              <p>Starts at: {formatDateTime(incomingSession.startsAt)}</p>
              <p className="meta-line">
                Type:{" "}
                <span className={`badge ${incomingSession.mandatory ? "badge-draft" : "badge-active"}`}>
                  {incomingSession.mandatory ? "MANDATORY" : "OPTIONAL"}
                </span>
              </p>
              <div className="spotlight-actions">
                <a className="spotlight-link" href={`/admin/sessions/detail?sessionId=${incomingSession.id}`}>
                  View Details
                </a>
              </div>
            </div>
          ))}
        </article>

        <article className="card calendar-card">
          <div className="calendar-head">
            <h2>Events Calendar</h2>
            <p>{calendarMonthLabel}</p>
          </div>
          <div className="calendar-weekdays">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>
          <div className="calendar-grid">
            {calendarCells.map((day, index) => {
              if (!day) {
                return <div key={`blank-${index}`} className="calendar-day empty" aria-hidden="true" />;
              }
              const currentDate = new Date(now.getFullYear(), now.getMonth(), day);
              const key = dateKeyLocal(currentDate);
              const daySessions = sessionsByDate.get(key) || [];
              const isToday = day === now.getDate();
              return (
                <div key={key} className={`calendar-day ${isToday ? "today" : ""}`}>
                  <div className="calendar-day-number">{day}</div>
                  <div className="calendar-events">
                    {daySessions.slice(0, 2).map((session) => (
                      <a
                        key={session.id}
                        className={`calendar-event ${session.mandatory ? "mandatory" : "optional"}`}
                        href={`/admin/sessions/detail?sessionId=${session.id}`}
                        title={`${session.eventName} | ${timeShort(session.startsAt)} - ${timeShort(session.endsAt)} | ${session.mandatory ? "Mandatory" : "Optional"} | ${session.status}`}
                      >
                        {session.eventName}
                      </a>
                    ))}
                    {daySessions.length > 2 && (
                      <span className="calendar-more" title={daySessions.map((s) => s.eventName).join(", ")}>
                        +{daySessions.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}


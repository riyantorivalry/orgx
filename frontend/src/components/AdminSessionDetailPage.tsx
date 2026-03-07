import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import type { AdminAttendanceRecord, AdminSessionDashboard, AdminSessionState } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

export function AdminSessionDetailPage() {
  const sessionId = useMemo(() => new URLSearchParams(globalThis.location.search).get("sessionId")?.trim() ?? "", []);
  const [detail, setDetail] = useState<AdminSessionState | null>(null);
  const [dashboard, setDashboard] = useState<AdminSessionDashboard | null>(null);
  const [attendance, setAttendance] = useState<AdminAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    let active = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [detailData, dashboardData, attendanceData] = await Promise.all([
          adminApi.getSessionDetail(sessionId),
          adminApi.getDashboard(sessionId),
          adminApi.getAttendance(sessionId),
        ]);
        if (active) {
          setDetail(detailData);
          setDashboard(dashboardData);
          setAttendance(attendanceData);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load session details");
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
  }, [sessionId]);

  if (!sessionId) {
    return (
      <main className="container">        <StatusMessage tone="warning" assertive>
          Missing sessionId. Open `/admin/sessions/detail?sessionId=&lt;uuid&gt;`.
        </StatusMessage>
      </main>
    );
  }

  return (
    <main className="container" aria-busy={loading}>      <header className="page-header">
        <h1>Session Details</h1>
        <p>Inspect session metadata, stats, and attendance records.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      {detail && (
        <section className="card">
          <h2>{detail.eventName}</h2>
          <p>
            Status: <span className={`badge badge-${detail.status.toLowerCase()}`}>{detail.status}</span>
          </p>
          <p>
            Type: <span className={`badge ${detail.mandatory ? "badge-draft" : "badge-active"}`}>{detail.mandatory ? "MANDATORY" : "OPTIONAL"}</span>
          </p>
          <p>Window: {formatDateTime(detail.startsAt)} - {formatDateTime(detail.endsAt)}</p>
          <p>Created By: {detail.createdBy}</p>
          <p>Created At: {formatDateTime(detail.createdAt)}</p>
        </section>
      )}

      {dashboard && (
        <section className="card">
          <h2>Session Statistics</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Total Check-ins</span>
              <strong>{dashboard.totalCheckIns}</strong>
            </div>
            <div className="metric-card">
              <span>Active Members</span>
              <strong>{dashboard.totalActiveMembers}</strong>
            </div>
            <div className="metric-card">
              <span>Check-in Rate</span>
              <strong>{dashboard.checkInRatePercent}%</strong>
            </div>
          </div>
          <div className="row-actions-buttons block-gap-sm">
            <a href={`/admin/monitor?sessionId=${sessionId}`}>Open Monitor</a>
            <a href={`/admin/qr?sessionId=${sessionId}`}>Open QR Display</a>
            <a href={adminApi.exportCsvUrl(sessionId)} target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Attendance Records</h2>
        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Member Code</th>
                <th>Member Name</th>
                <th>Checked In At</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {!attendance.length && (
                <tr>
                  <td colSpan={5}>No attendance records yet.</td>
                </tr>
              )}
              {attendance.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.memberCode}</td>
                  <td>{item.memberName}</td>
                  <td>{formatDateTime(item.checkedInAt)}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import { useAdminMonitor } from "../hooks/useAdminMonitor";
import { StatusMessage } from "./StatusMessage";

export function AdminMonitorPage() {
  const { sessionId, loading, error, dashboard, attendance, refresh } = useAdminMonitor();

  if (!sessionId) {
    return (
      <main className="container">
        <StatusMessage tone="warning" assertive>
          Missing sessionId. Open this page with `/admin/monitor?sessionId=&lt;uuid&gt;`.
        </StatusMessage>
      </main>
    );
  }

  return (
    <main className="container" aria-busy={loading}>      <header className="page-header">
        <h1>Admin Session Monitor</h1>
        <p>Real-time refresh every 5 seconds.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      {dashboard && (
        <section className="card">
          <h2>{dashboard.eventName}</h2>
          <p className="meta-line">
            Status: <span className={`badge badge-${dashboard.status.toLowerCase()}`}>{dashboard.status}</span>
          </p>
          <p className="meta-line">Window: {formatDateTime(dashboard.startsAt)} - {formatDateTime(dashboard.endsAt)}</p>
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
        </section>
      )}

      <section className="card">
        <div className="row-actions">
          <h2>Attendance List</h2>
          <div className="row-actions-buttons">
            <button type="button" onClick={() => void refresh()} disabled={loading}>
              Refresh Now
            </button>
            <a href={adminApi.exportCsvUrl(sessionId)} target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </div>

        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Member Code</th>
                <th>Name</th>
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
              {attendance.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.memberCode}</td>
                  <td>{row.memberName}</td>
                  <td>{formatDateTime(row.checkedInAt)}</td>
                  <td>{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


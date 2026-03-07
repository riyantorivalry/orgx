import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import type { AdminMember, AdminMemberAttendanceSession, AdminMemberAttendanceStats } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

export function AdminMemberDetailPage() {
  const memberId = useMemo(() => new URLSearchParams(globalThis.location.search).get("memberId")?.trim() ?? "", []);
  const [member, setMember] = useState<AdminMember | null>(null);
  const [attendedSessions, setAttendedSessions] = useState<AdminMemberAttendanceSession[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AdminMemberAttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!memberId) {
      return;
    }
    let active = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [data, attendanceSessionsData, attendanceStatsData] = await Promise.all([
          adminApi.getMemberDetail(memberId),
          adminApi.getMemberAttendanceSessions(memberId),
          adminApi.getMemberAttendanceStats(memberId),
        ]);
        if (active) {
          setMember(data);
          setFullName(data.fullName);
          setDob(data.dob || "");
          setBloodType(data.bloodType || "");
          setMobileNumber(data.mobileNumber || "");
          setEmail(data.email || "");
          setAddress(data.address || "");
          setActive(data.active);
          setAttendedSessions(attendanceSessionsData);
          setAttendanceStats(attendanceStatsData);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load member details");
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
  }, [memberId]);

  if (!memberId) {
    return (
      <main className="container">
        <StatusMessage tone="warning" assertive>
          Missing memberId. Open `/admin/members/detail?memberId=&lt;uuid&gt;`.
        </StatusMessage>
      </main>
    );
  }

  const onSave = async () => {
    if (!member) {
      return;
    }
    setError("");
    setSaveMessage("");
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adminApi.updateMember(member.id, {
        fullName: fullName.trim(),
        dob: dob || undefined,
        bloodType: bloodType || undefined,
        mobileNumber: mobileNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        active,
      });
      setMember(updated);
      setSaveMessage("Member details updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container" aria-busy={loading}>
      <header className="page-header">
        <h1>Member Details</h1>
        <p>Review a member profile and status.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}
      {saveMessage && <StatusMessage tone="success">{saveMessage}</StatusMessage>}

      {member && (
        <>
          <section className="card member-hero">
            <div className="member-hero-head">
              <div>
                <h2>Member Profile</h2>
                <p className="member-subtitle">{member.memberCode}</p>
              </div>
              <span className={`badge ${member.active ? "badge-active" : "badge-closed"}`}>
                {member.active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <form className="admin-form profile-form" onSubmit={(e) => { e.preventDefault(); void onSave(); }}>
              <label>
                <span className="field-label">Full Name <span className="required-star">*</span></span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
              <label>
                Date of Birth
                <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
              </label>
              <label>
                Blood Type
                <input
                  type="text"
                  value={bloodType}
                  onChange={(event) => setBloodType(event.target.value)}
                  placeholder="A+, O-, AB"
                />
              </label>
              <label>
                Mobile Number
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(event) => setMobileNumber(event.target.value)}
                  placeholder="+62 8123456789"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </label>
              <label>
                Address
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                Active member
              </label>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>

            <div className="row-actions-buttons">
              <a href="/admin/members">Back to Member List</a>
            </div>
          </section>

          <section className="card">
            <h2>Attended Sessions</h2>
            {attendanceStats && (
              <div className="metric-grid">
                <div className="metric-card">
                  <span>Mandatory Attendance Rate</span>
                  <strong>{attendanceStats.mandatoryRatePercent}%</strong>
                  <small>{attendanceStats.mandatoryAttended}/{attendanceStats.mandatoryTotal} sessions</small>
                </div>
                <div className="metric-card">
                  <span>Optional Attendance Rate</span>
                  <strong>{attendanceStats.optionalRatePercent}%</strong>
                  <small>{attendanceStats.optionalAttended}/{attendanceStats.optionalTotal} sessions</small>
                </div>
              </div>
            )}
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Session</th>
                    <th>Checked In At</th>
                    <th>Status</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {!attendedSessions.length && (
                    <tr>
                      <td colSpan={5}>No attended sessions yet.</td>
                    </tr>
                  )}
                  {attendedSessions.map((item, index) => (
                    <tr key={`${item.sessionId}-${item.checkedInAt}`}>
                      <td>{index + 1}</td>
                      <td>
                        <a href={`/admin/sessions/detail?sessionId=${item.sessionId}`}>{item.eventName}</a>
                      </td>
                      <td>{formatDateTime(item.checkedInAt)}</td>
                      <td>
                        <span className={`badge badge-${item.sessionStatus.toLowerCase()}`}>{item.sessionStatus}</span>
                      </td>
                      <td>{item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}



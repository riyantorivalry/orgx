import { FormEvent, useMemo, useState } from "react";
import { adminApi } from "../services/adminApi";
import type { AdminSessionState } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

function toOffsetIso(localDateTime: string): string {
  const date = new Date(localDateTime);
  return date.toISOString();
}

function defaultEnd(startLocal: string): string {
  const start = new Date(startLocal);
  start.setHours(start.getHours() + 2);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}T${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
}

function currentLocalDateTime(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function AdminCreateSessionPage() {
  const initialStart = useMemo(() => currentLocalDateTime(), []);
  const [eventName, setEventName] = useState("");
  const [startsAt, setStartsAt] = useState(initialStart);
  const [endsAt, setEndsAt] = useState(defaultEnd(initialStart));
  const [mandatory, setMandatory] = useState<"" | "true" | "false">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdSession, setCreatedSession] = useState<AdminSessionState | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCreatedSession(null);

    if (!eventName.trim() || !startsAt || !endsAt || mandatory === "") {
      setError("All fields are required.");
      return;
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    try {
      const result = await adminApi.createSession({
        eventName: eventName.trim(),
        startsAt: toOffsetIso(startsAt),
        endsAt: toOffsetIso(endsAt),
        mandatory: mandatory === "true",
      });
      localStorage.setItem("lastSessionId", result.id);
      setCreatedSession(result);
      setShowSuccessPopup(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" aria-busy={loading}>      <header className="page-header">
        <h1>Create Attendance Session</h1>
        <p>Set event details and attendance window (typically 2-3 hours).</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      {createdSession && !showSuccessPopup && (
        <StatusMessage tone="success">
          Session created successfully. Session ID: {createdSession.id}
        </StatusMessage>
      )}

      <section className="card">
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            Event Name
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Sunday Service"
              required
            />
          </label>

          <label>
            Starts At
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>

          <label>
            Ends At
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </label>

          <label>
            <span className="field-label">Is Mandatory <span className="required-star">*</span></span>
            <select
              value={mandatory}
              onChange={(e) => setMandatory(e.target.value as "" | "true" | "false")}
              required
            >
              <option value="">Select option</option>
              <option value="true">Mandatory</option>
              <option value="false">Optional</option>
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </button>
        </form>
      </section>

      {createdSession && showSuccessPopup && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Session created">
          <section className="card modal-card">
            <button
              type="button"
              className="modal-close-x"
              onClick={() => { globalThis.location.href = "/admin/sessions"; }}
              aria-label="Close popup"
            >
              &times;
            </button>
            <h2 className="modal-title">Session Created</h2>
            <p>Session ID: <code>{createdSession.id}</code></p>
            <div className="row-actions-buttons">
              <a href={`/admin/monitor?sessionId=${createdSession.id}`}>Open Monitor</a>
              <a href={`/admin/qr?sessionId=${createdSession.id}`}>Open QR Display</a>
              <a href="/admin/sessions">Back to Session List</a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

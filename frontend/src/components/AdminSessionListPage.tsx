import { FormEvent, useEffect, useState } from "react";
import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import type { AdminSessionListItem } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

export function AdminSessionListPage() {
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showCreatedPopup, setShowCreatedPopup] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [eventName, setEventName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [mandatory, setMandatory] = useState<"" | "true" | "false">("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listSessions();
      setSessions(data);
      setCurrentPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => sessions.some((s) => s.id === id)));
  }, [sessions]);

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStart = (currentPageSafe - 1) * pageSize;
  const visibleSessions = sessions.slice(pageStart, pageStart + pageSize);
  const selectedCount = selectedIds.length;
  const selectedSession = selectedCount === 1 ? sessions.find((s) => s.id === selectedIds[0]) : null;

  const toggleSelection = (sessionId: string) => {
    setSelectedIds((prev) => prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]);
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleSessions.map((s) => s.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const openUpdateModal = () => {
    if (!selectedSession) {
      return;
    }
    setEventName(selectedSession.eventName);
    setStartsAt(selectedSession.startsAt.slice(0, 16));
    setEndsAt(selectedSession.endsAt.slice(0, 16));
    setMandatory(selectedSession.mandatory ? "true" : "false");
    setUpdateError("");
    setShowUpdateModal(true);
  };

  const onUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSession) {
      return;
    }
    if (!eventName.trim() || !startsAt || !endsAt || mandatory === "") {
      setUpdateError("All fields are required.");
      return;
    }
    setUpdating(true);
    setUpdateError("");
    try {
      await adminApi.updateSession(selectedSession.id, {
        eventName: eventName.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        mandatory: mandatory === "true",
      });
      setShowUpdateModal(false);
      await load();
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update session");
    } finally {
      setUpdating(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!selectedIds.length) {
      return;
    }
    if (!globalThis.confirm(`Delete ${selectedIds.length} selected session(s)?`)) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      for (const sessionId of selectedIds) {
        await adminApi.deleteSession(sessionId);
      }
      setSelectedIds([]);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete session(s)");
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setEventName("");
    setStartsAt("");
    setEndsAt("");
    setMandatory("");
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !startsAt || !endsAt || mandatory === "") {
      setCreateError("All fields are required.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const result = await adminApi.createSession({
        eventName: eventName.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        mandatory: mandatory === "true",
      });
      setCreatedSessionId(result.id);
      setShowCreateModal(false);
      setShowCreatedPopup(true);
      resetForm();
      await load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="container" aria-busy={loading}>      <header className="page-header">
        <h1>Sessions</h1>
        <p>View all attendance sessions and open details.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      <section className="card">
        <div className="row-actions">
          <h2>Session List</h2>
          <div className="row-actions-buttons">
            {selectedCount > 0 && (
              <>
                <button type="button" onClick={openUpdateModal} disabled={selectedCount !== 1 || updating || deleting}>
                  Update
                </button>
                <button type="button" onClick={() => void onDeleteSelected()} disabled={updating || deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
            <button type="button" onClick={() => setShowCreateModal(true)}>Create Session</button>
          </div>
        </div>

        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={visibleSessions.length > 0 && visibleSessions.every((s) => selectedIds.includes(s.id))}
                    onChange={toggleSelectAll}
                    aria-label="Select all sessions"
                  />
                </th>
                <th>Event</th>
                <th>Type</th>
                <th>Window</th>
                <th>Status</th>
                <th>Info</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!sessions.length && (
                <tr>
                  <td colSpan={7}>No sessions found.</td>
                </tr>
              )}
              {visibleSessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(session.id)}
                      onChange={() => toggleSelection(session.id)}
                      aria-label={`Select ${session.eventName}`}
                    />
                  </td>
                  <td>{session.eventName}</td>
                  <td>
                    <span className={`badge ${session.mandatory ? "badge-draft" : "badge-active"}`}>
                      {session.mandatory ? "MANDATORY" : "OPTIONAL"}
                    </span>
                  </td>
                  <td>{formatDateTime(session.startsAt)} - {formatDateTime(session.endsAt)}</td>
                  <td>
                    <span className={`badge badge-${session.status.toLowerCase()}`}>{session.status}</span>
                  </td>
                  <td className="text-right">
                    <span
                      className="info-tooltip"
                      title={`Created by: ${session.createdBy}\nUpdated by: ${session.updatedBy}\nCreated at: ${formatDateTime(session.createdAt)}\nUpdated at: ${formatDateTime(session.updatedAt)}`}
                    >
                      i
                    </span>
                  </td>
                  <td>
                    <a href={`/admin/sessions/detail?sessionId=${session.id}`}>Details</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length > pageSize && (
          <div className="pagination-row">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPageSafe === 1}
            >
              Previous
            </button>
            <span>Page {currentPageSafe} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPageSafe === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {showUpdateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Update session">
          <section className="card modal-card">
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setShowUpdateModal(false)}
              disabled={updating}
              aria-label="Close popup"
            >
              ×
            </button>
            <h2 className="modal-title">Update</h2>
            {updateError && (
              <StatusMessage tone="error" assertive>
                {updateError}
              </StatusMessage>
            )}
            <form className="admin-form" onSubmit={(e) => void onUpdate(e)}>
              <label>
                <span className="field-label">Event Name <span className="required-star">*</span></span>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
              </label>
              <label>
                <span className="field-label">Starts At <span className="required-star">*</span></span>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
              </label>
              <label>
                <span className="field-label">Ends At <span className="required-star">*</span></span>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
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
              <button type="submit" disabled={updating}>
                {updating ? "Updating..." : "Update"}
              </button>
            </form>
          </section>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create session">
          <section className="card modal-card">
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
              aria-label="Close popup"
            >
              ×
            </button>
            <h2 className="modal-title">Create Session</h2>
            {createError && (
              <StatusMessage tone="error" assertive>
                {createError}
              </StatusMessage>
            )}
            <form className="admin-form" onSubmit={(e) => void onCreate(e)}>
              <label>
                <span className="field-label">Event Name <span className="required-star">*</span></span>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
              </label>
              <label>
                <span className="field-label">Starts At <span className="required-star">*</span></span>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
              </label>
              <label>
                <span className="field-label">Ends At <span className="required-star">*</span></span>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
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
              <button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Session"}
              </button>
            </form>
          </section>
        </div>
      )}

      {showCreatedPopup && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Session created">
          <section className="card modal-card">
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setShowCreatedPopup(false)}
              aria-label="Close popup"
            >
              ×
            </button>
            <h2 className="modal-title">Session Created</h2>
            <p>Session ID: <code>{createdSessionId}</code></p>
            <div className="row-actions-buttons">
              <a href={`/admin/monitor?sessionId=${createdSessionId}`}>Open Monitor</a>
              <a href={`/admin/qr?sessionId=${createdSessionId}`}>Open QR Display</a>
              <button type="button" onClick={() => setShowCreatedPopup(false)}>Back</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}



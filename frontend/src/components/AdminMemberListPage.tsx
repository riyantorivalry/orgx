import { FormEvent, useEffect, useState } from "react";
import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import type { AdminMember } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

function filterValidSelectedIds(selectedIds: string[], members: AdminMember[]): string[] {
  const memberIds = new Set(members.map((member) => member.id));
  return selectedIds.filter((id) => memberIds.has(id));
}

export function AdminMemberListPage() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = async (searchQuery: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listMembers(searchQuery, true);
      setMembers(data);
      setCurrentPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => filterValidSelectedIds(prev, members));
  }, [members]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    void load(query);
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError("");
    if (!fullName.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    setCreating(true);
    try {
      await adminApi.createMember({
        fullName: fullName.trim(),
        dob: dob || undefined,
        bloodType: bloodType || undefined,
        mobileNumber: mobileNumber || undefined,
        address: address || undefined,
        email: email || undefined,
        active,
      });
      setShowCreateModal(false);
      setFullName("");
      setDob("");
      setBloodType("");
      setMobileNumber("");
      setAddress("");
      setEmail("");
      setActive(true);
      await load(query);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create member");
    } finally {
      setCreating(false);
    }
  };

  const selectedCount = selectedIds.length;
  const selectedMember = selectedCount === 1 ? members.find((m) => m.id === selectedIds[0]) : null;
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStart = (currentPageSafe - 1) * pageSize;
  const visibleMembers = members.slice(pageStart, pageStart + pageSize);

  const openUpdateModal = () => {
    if (!selectedMember) {
      return;
    }
    setFullName(selectedMember.fullName);
    setDob(selectedMember.dob || "");
    setBloodType(selectedMember.bloodType || "");
    setMobileNumber(selectedMember.mobileNumber || "");
    setAddress(selectedMember.address || "");
    setEmail(selectedMember.email || "");
    setActive(selectedMember.active);
    setUpdateError("");
    setShowUpdateModal(true);
  };

  const onUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMember) {
      return;
    }
    setUpdateError("");
    if (!fullName.trim()) {
      setUpdateError("Full name is required.");
      return;
    }
    setUpdating(true);
    try {
      await adminApi.updateMember(selectedMember.id, {
        fullName: fullName.trim(),
        dob: dob || undefined,
        bloodType: bloodType || undefined,
        mobileNumber: mobileNumber || undefined,
        address: address || undefined,
        email: email || undefined,
        active,
      });
      setShowUpdateModal(false);
      await load(query);
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setUpdating(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!selectedIds.length) {
      return;
    }
    const confirmed = globalThis.confirm(`Delete ${selectedIds.length} selected member(s)?`);
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      for (const memberId of selectedIds) {
        await adminApi.deleteMember(memberId);
      }
      setSelectedIds([]);
      await load(query);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete member(s)");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelection = (memberId: string) => {
    setSelectedIds((prev) => prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]);
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleMembers.map((m) => m.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  return (
    <main className="container" aria-busy={loading}>
      <header className="page-header">
        <h1>Members</h1>
        <p>Browse and inspect member records.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      <section className="card">
        <form className="search-form" onSubmit={onSearch}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or member code"
          />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="card">
        <div className="row-actions">
          <h2></h2>
          <div className="row-actions-buttons">
            {selectedCount > 0 && (
              <>
                <button type="button" onClick={openUpdateModal} disabled={selectedCount !== 1 || updating || deleting}>
                  Update
                </button>
                <button type="button" onClick={() => void onDeleteSelected()} disabled={deleting || updating}>
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
            <button type="button" onClick={() => setShowCreateModal(true)}>Create Member</button>
          </div>
        </div>
        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      visibleMembers.length > 0
                      && visibleMembers.every((member) => selectedIds.includes(member.id))
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all members"
                  />
                </th>
                <th>Member Code</th>
                <th>Full Name</th>
                <th>Blood Type</th>
                <th>Mobile Number</th>
                <th>Status</th>
                <th>Info</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!members.length && (
                <tr>
                  <td colSpan={8}>No members found.</td>
                </tr>
              )}
              {visibleMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.id)}
                      onChange={() => toggleSelection(member.id)}
                      aria-label={`Select ${member.fullName}`}
                    />
                  </td>
                  <td>{member.memberCode}</td>
                  <td>{member.fullName}</td>
                  <td>{member.bloodType || "-"}</td>
                  <td>{member.mobileNumber || "-"}</td>
                  <td>
                    <span className={`badge ${member.active ? "badge-active" : "badge-closed"}`}>
                      {member.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      className="info-tooltip"
                      title={`Created by: ${member.createdBy}\nUpdated by: ${member.updatedBy}\nCreated at: ${formatDateTime(member.createdAt)}\nUpdated at: ${formatDateTime(member.updatedAt)}`}
                      aria-label={`Created by ${member.createdBy}, updated by ${member.updatedBy}`}
                    >
                      i
                    </span>
                  </td>
                  <td>
                    <a href={`/admin/members/detail?memberId=${member.id}`}>Details</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {members.length > pageSize && (
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

      {showCreateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create member">
          <section className="card modal-card has-zones">
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
              aria-label="Close popup"
            >
              &times;
            </button>
            <div className="modal-panel-header">
              <h2 className="modal-title">New Member</h2>
            </div>
            <div className="modal-panel-body">
              {createError && (
                <StatusMessage tone="error" assertive>
                  {createError}
                </StatusMessage>
              )}
              <form id="create-member-form" className="admin-form" onSubmit={onCreate}>
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
                  Address
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
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
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                  />
                  Active member
                </label>
              </form>
            </div>
            <div className="modal-panel-footer">
              <button type="submit" form="create-member-form" disabled={creating}>
                {creating ? "Saving..." : "Save"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showUpdateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Update member">
          <section className="card modal-card has-zones">
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setShowUpdateModal(false)}
              disabled={updating}
              aria-label="Close popup"
            >
              &times;
            </button>
            <div className="modal-panel-header">
              <h2 className="modal-title">Update Member</h2>
            </div>
            <div className="modal-panel-body">
              {updateError && (
                <StatusMessage tone="error" assertive>
                  {updateError}
                </StatusMessage>
              )}
              <form id="update-member-form" className="admin-form" onSubmit={onUpdate}>
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
                  Address
                  <input type="text" value={address} onChange={(event) => setAddress(event.target.value)} />
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
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                  />
                  Active member
                </label>
              </form>
            </div>
            <div className="modal-panel-footer">
              <button type="submit" form="update-member-form" disabled={updating}>
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

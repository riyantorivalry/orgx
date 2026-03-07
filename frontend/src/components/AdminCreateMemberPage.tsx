import { FormEvent, useState } from "react";
import { adminApi } from "../services/adminApi";
import { StatusMessage } from "./StatusMessage";

type CreatedMember = {
  id: string;
  memberCode: string;
  fullName: string;
  active: boolean;
};

export function AdminCreateMemberPage() {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdMember, setCreatedMember] = useState<CreatedMember | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCreatedMember(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    try {
      const member = await adminApi.createMember({
        fullName: fullName.trim(),
        dob: dob || undefined,
        bloodType: bloodType || undefined,
        mobileNumber: mobileNumber || undefined,
        address: address || undefined,
        email: email || undefined,
        active,
      });
      setCreatedMember(member);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" aria-busy={loading}>
      <header className="page-header">
        <h1>Create New</h1>
        <p>Add a member who can check in from QR attendance page.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      {createdMember && (
        <StatusMessage tone="success">
          Member created: {createdMember.fullName} ({createdMember.memberCode})
        </StatusMessage>
      )}

      <section className="card">
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Full Name <span className="required-star">*</span></span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="John Doe"
              required
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
            Date of Birth
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
            />
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
              placeholder="Street, City"
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

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "New Member"}
          </button>
        </form>
      </section>
    </main>
  );
}


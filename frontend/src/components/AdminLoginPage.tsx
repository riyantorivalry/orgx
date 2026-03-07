import { FormEvent, useState } from "react";
import { authApi } from "../services/authApi";
import { StatusMessage } from "./StatusMessage";

export function AdminLoginPage() {
  const params = new URLSearchParams(globalThis.location.search);
  const next = params.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.login(username.trim(), password);
      globalThis.location.href = next;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container auth-container" aria-busy={loading}>
      <section className="card auth-card">
        <h1>Admin Login</h1>
        <p>Sign in to manage sessions, members, and QR display.</p>

        {error && (
          <StatusMessage tone="error" assertive>
            {error}
          </StatusMessage>
        )}

        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}

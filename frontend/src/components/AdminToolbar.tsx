import { authApi } from "../services/authApi";

export function AdminToolbar() {
  const onLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      globalThis.location.href = "/admin/login";
    }
  };

  return (
    <nav className="admin-toolbar" aria-label="Admin navigation">
      <div className="admin-toolbar-left">
        <a href="/admin" className="admin-brand">Dashboard</a>
        <a href="/admin/sessions">Sessions</a>
        <a href="/admin/members">Members</a>
        <button type="button" className="admin-nav-placeholder" disabled>Groups (Soon)</button>
        <button type="button" className="admin-nav-placeholder" disabled>Finance (Soon)</button>
      </div>
      <div className="admin-toolbar-right">
        <button type="button" onClick={() => void onLogout()}>Logout</button>
      </div>
    </nav>
  );
}

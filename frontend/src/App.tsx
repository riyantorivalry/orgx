import { AdminCreateMemberPage } from "./components/AdminCreateMemberPage";
import { AdminCreateSessionPage } from "./components/AdminCreateSessionPage";
import { AdminDashboardPage } from "./components/AdminDashboardPage";
import { AdminLoginPage } from "./components/AdminLoginPage";
import { AdminMemberDetailPage } from "./components/AdminMemberDetailPage";
import { AdminMemberListPage } from "./components/AdminMemberListPage";
import { AdminProtected } from "./components/AdminProtected";
import { AdminQrDisplayPage } from "./components/AdminQrDisplayPage";
import { AdminMonitorPage } from "./components/AdminMonitorPage";
import { AdminSessionDetailPage } from "./components/AdminSessionDetailPage";
import { AdminSessionListPage } from "./components/AdminSessionListPage";
import { AdminToolbar } from "./components/AdminToolbar";
import { MemberCheckInPage } from "./components/MemberCheckInPage";

export function App() {
  const path = globalThis.location.pathname;
  if (path.startsWith("/admin/login")) {
    return <AdminLoginPage />;
  }

  if (path.startsWith("/admin")) {
    return (
      <AdminProtected>
        <div className="admin-shell">
          <AdminToolbar />
          <AdminAdminRoutes path={path} />
        </div>
      </AdminProtected>
    );
  }
  return <MemberCheckInPage />;
}

type AdminAdminRoutesProps = {
  path: string;
};

function AdminAdminRoutes({ path }: AdminAdminRoutesProps) {
  if (path === "/admin" || path === "/admin/") {
    return <AdminDashboardPage />;
  }
  if (path.startsWith("/admin/sessions/new")) {
    return <AdminCreateSessionPage />;
  }
  if (path.startsWith("/admin/sessions/detail")) {
    return <AdminSessionDetailPage />;
  }
  if (path.startsWith("/admin/sessions")) {
    return <AdminSessionListPage />;
  }
  if (path.startsWith("/admin/members/new")) {
    return <AdminCreateMemberPage />;
  }
  if (path.startsWith("/admin/members/detail")) {
    return <AdminMemberDetailPage />;
  }
  if (path.startsWith("/admin/members")) {
    return <AdminMemberListPage />;
  }
  if (path.startsWith("/admin/qr")) {
    return <AdminQrDisplayPage />;
  }
  if (path.startsWith("/admin/monitor")) {
    return <AdminMonitorPage />;
  }
  return <AdminDashboardPage />;
}

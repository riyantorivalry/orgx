import { ReactNode, useEffect, useState } from "react";
import { authApi } from "../services/authApi";

type AdminProtectedProps = {
  children: ReactNode;
};

export function AdminProtected({ children }: AdminProtectedProps) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await authApi.me();
        if (active) {
          setAllowed(true);
        }
      } catch {
        const next = encodeURIComponent(globalThis.location.pathname + globalThis.location.search);
        globalThis.location.href = `/admin/login?next=${next}`;
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <main className="container">
        <p className="loading-text">Checking admin session...</p>
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}

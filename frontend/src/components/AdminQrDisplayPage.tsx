import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { formatDateTime } from "../lib/date";
import { adminApi } from "../services/adminApi";
import type { AdminSessionDashboard, AdminTokenResponse } from "../types/admin";
import { StatusMessage } from "./StatusMessage";

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AdminQrDisplayPage() {
  const sessionId = useMemo(() => new URLSearchParams(globalThis.location.search).get("sessionId")?.trim() ?? "", []);
  const [dashboard, setDashboard] = useState<AdminSessionDashboard | null>(null);
  const [tokenData, setTokenData] = useState<AdminTokenResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const checkInUrl = tokenData
    ? `${globalThis.location.origin}/check-in?token=${encodeURIComponent(tokenData.token)}`
    : "";

  const refreshDashboard = async () => {
    if (!sessionId) {
      return;
    }
    const data = await adminApi.getDashboard(sessionId);
    setDashboard(data);
  };

  const refreshToken = async () => {
    if (!sessionId) {
      return;
    }
    const token = await adminApi.issueToken(sessionId);
    setTokenData(token);
  };

  useEffect(() => {
    if (!checkInUrl) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(checkInUrl, { width: 420, margin: 1, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => setError("Failed to render QR image."));
    return () => {
      cancelled = true;
    };
  }, [checkInUrl]);

  useEffect(() => {
    if (!tokenData?.expiresAt) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(tokenData.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tokenData?.expiresAt]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        await refreshDashboard();
        await refreshToken();
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load QR display");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!tokenData?.expiresAt || !sessionId) {
      return;
    }

    const remainingMs = new Date(tokenData.expiresAt).getTime() - Date.now();
    const refreshInMs = Math.max(0, remainingMs - 10000);

    const timeout = setTimeout(() => {
      void refreshToken().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to auto-refresh token");
      });
    }, refreshInMs);

    return () => clearTimeout(timeout);
  }, [tokenData?.expiresAt, sessionId]);

  const runAction = async (action: () => Promise<unknown>, successFollowUp: () => Promise<void>) => {
    setActionLoading(true);
    setError("");
    try {
      await action();
      await successFollowUp();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <main className="container">
        <StatusMessage tone="warning" assertive>
          Missing sessionId. Open this page with `/admin/qr?sessionId=&lt;uuid&gt;`.
        </StatusMessage>
      </main>
    );
  }

  return (
    <main className="container qr-page" aria-busy={loading || actionLoading}>      <header className="page-header">
        <h1>QR Display</h1>
        <p>Use this page on the projector screen for member check-in.</p>
      </header>

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      <section className="card">
        <div className="row-actions">
          <h2>{dashboard?.eventName || "Session"}</h2>
          <div className="row-actions-buttons">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void runAction(() => adminApi.startSession(sessionId), refreshDashboard)}
            >
              Start
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void runAction(() => adminApi.closeSession(sessionId), refreshDashboard)}
            >
              Close
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void runAction(refreshToken, refreshDashboard)}
            >
              Refresh Token
            </button>
          </div>
        </div>

        {dashboard && (
          <>
            <p className="meta-line">
              Status: <span className={`badge badge-${dashboard.status.toLowerCase()}`}>{dashboard.status}</span>
            </p>
            <p className="meta-line">Window: {formatDateTime(dashboard.startsAt)} - {formatDateTime(dashboard.endsAt)}</p>
          </>
        )}
      </section>

      {dashboard?.status !== "ACTIVE" && (
        <StatusMessage tone="warning">
          Session is not active. Start the session to accept attendance.
        </StatusMessage>
      )}

      <section className="card qr-card">
        {qrDataUrl ? (
          <img className="qr-image" src={qrDataUrl} alt="Attendance check-in QR code" />
        ) : (
          <p className="loading-text">Generating QR...</p>
        )}
        <p className="qr-meta">Token expires in: {formatSeconds(secondsLeft)}</p>
        <p className="qr-link">{checkInUrl || "Waiting for token..."}</p>
      </section>
    </main>
  );
}


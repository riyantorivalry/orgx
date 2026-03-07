import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../services/adminApi";
import type { AdminAttendanceRecord, AdminSessionDashboard } from "../types/admin";

type AdminMonitorState = {
  sessionId: string;
  loading: boolean;
  error: string;
  dashboard: AdminSessionDashboard | null;
  attendance: AdminAttendanceRecord[];
  refresh: () => Promise<void>;
};

export function useAdminMonitor(): AdminMonitorState {
  const sessionId = useMemo(() => new URLSearchParams(globalThis.location.search).get("sessionId")?.trim() ?? "", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<AdminSessionDashboard | null>(null);
  const [attendance, setAttendance] = useState<AdminAttendanceRecord[]>([]);

  const refresh = async () => {
    if (!sessionId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [dashboardData, attendanceData] = await Promise.all([
        adminApi.getDashboard(sessionId),
        adminApi.getAttendance(sessionId),
      ]);
      setDashboard(dashboardData);
      setAttendance(attendanceData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load session monitoring data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    let active = true;

    const run = async () => {
      await refresh();
    };
    void run();

    const interval = setInterval(() => {
      if (active) {
        void run();
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  return { sessionId, loading, error, dashboard, attendance, refresh };
}

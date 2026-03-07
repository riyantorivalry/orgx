import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { attendanceApi } from "../services/attendanceApi";
import type { AttendanceResult, Member, PublicSession } from "../types/attendance";

type AttendanceFlowState = {
  token: string;
  session: PublicSession | null;
  members: Member[];
  query: string;
  loading: boolean;
  error: string;
  result: AttendanceResult | null;
  submittingMemberId: string;
  setQuery: (value: string) => void;
  searchMembers: (event: FormEvent) => Promise<void>;
  submitAttendance: (memberId: string) => Promise<void>;
};

export function useAttendanceFlow(): AttendanceFlowState {
  const token = useMemo(() => new URLSearchParams(globalThis.location.search).get("token")?.trim() ?? "", []);

  const [session, setSession] = useState<PublicSession | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [submittingMemberId, setSubmittingMemberId] = useState("");

  const loadMembers = useCallback(async (sessionId: string, searchQuery: string) => {
    const data = await attendanceApi.listMembers(sessionId, searchQuery);
    setMembers(data);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const sessionData = await attendanceApi.validateToken(token);
        if (cancelled) {
          return;
        }
        setSession(sessionData);
        await loadMembers(sessionData.id, "");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to validate token");
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
  }, [token, loadMembers]);

  const searchMembers = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!session) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loadMembers(session.id, query);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [loadMembers, query, session]);

  const submitAttendance = useCallback(async (memberId: string) => {
    if (!token) {
      return;
    }
    setSubmittingMemberId(memberId);
    setError("");
    setResult(null);

    try {
      const payload = await attendanceApi.submitAttendance(token, memberId);
      setResult({
        status: payload.status || "recorded",
        message: payload.message || "Attendance recorded",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Attendance submission failed");
    } finally {
      setSubmittingMemberId("");
    }
  }, [token]);

  return {
    token,
    session,
    members,
    query,
    loading,
    error,
    result,
    submittingMemberId,
    setQuery,
    searchMembers,
    submitAttendance,
  };
}

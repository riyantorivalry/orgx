import { requestJson } from "./apiClient";
import type { AttendanceResult, Member, PublicSession } from "../types/attendance";

export const attendanceApi = {
  validateToken(token: string): Promise<PublicSession> {
    return requestJson<PublicSession>(`/api/public/sessions/by-token/${encodeURIComponent(token)}`);
  },

  listMembers(sessionId: string, query: string): Promise<Member[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return requestJson<Member[]>(`/api/public/sessions/${sessionId}/members${suffix}`);
  },

  submitAttendance(token: string, memberId: string): Promise<AttendanceResult> {
    return requestJson<AttendanceResult>("/api/public/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, memberId }),
    });
  },
};

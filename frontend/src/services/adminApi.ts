import { requestJson } from "../lib/http";
import type {
  AdminAttendanceRecord,
  AdminMember,
  AdminMemberAttendanceSession,
  AdminMemberAttendanceStats,
  AdminSessionDashboard,
  AdminSessionListItem,
  AdminSessionState,
  AdminTokenResponse,
} from "../types/admin";

type CreateSessionInput = {
  eventName: string;
  startsAt: string;
  endsAt: string;
  mandatory: boolean;
};

type CreateMemberInput = {
  fullName: string;
  dob?: string;
  bloodType?: string;
  address?: string;
  email?: string;
  mobileNumber?: string;
  active: boolean;
};

export const adminApi = {
  createSession(input: CreateSessionInput): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  getDashboard(sessionId: string): Promise<AdminSessionDashboard> {
    return requestJson<AdminSessionDashboard>(`/api/admin/sessions/${sessionId}`);
  },

  listSessions(): Promise<AdminSessionListItem[]> {
    return requestJson<AdminSessionListItem[]>("/api/admin/sessions");
  },

  getSessionDetail(sessionId: string): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}/detail`);
  },

  getAttendance(sessionId: string): Promise<AdminAttendanceRecord[]> {
    return requestJson<AdminAttendanceRecord[]>(`/api/admin/sessions/${sessionId}/attendance`);
  },

  exportCsvUrl(sessionId: string): string {
    return `/api/admin/sessions/${sessionId}/export.csv`;
  },

  issueToken(sessionId: string): Promise<AdminTokenResponse> {
    return requestJson<AdminTokenResponse>(`/api/admin/sessions/${sessionId}/tokens`, {
      method: "POST",
    });
  },

  startSession(sessionId: string): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}/start`, {
      method: "POST",
    });
  },

  closeSession(sessionId: string): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}/close`, {
      method: "POST",
    });
  },

  updateSession(sessionId: string, input: CreateSessionInput): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  deleteSession(sessionId: string): Promise<void> {
    return requestJson<void>(`/api/admin/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  createMember(input: CreateMemberInput): Promise<{
    id: string;
    memberCode: string;
    fullName: string;
    active: boolean;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    dob?: string | null;
    bloodType?: string | null;
    address?: string | null;
    email?: string | null;
    mobileNumber?: string | null;
  }> {
    return requestJson("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  listMembers(query = "", includeInactive = true): Promise<AdminMember[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    params.set("includeInactive", String(includeInactive));
    return requestJson<AdminMember[]>(`/api/admin/members?${params.toString()}`);
  },

  getMemberDetail(memberId: string): Promise<AdminMember> {
    return requestJson<AdminMember>(`/api/admin/members/${memberId}`);
  },

  getMemberAttendanceSessions(memberId: string): Promise<AdminMemberAttendanceSession[]> {
    return requestJson<AdminMemberAttendanceSession[]>(`/api/admin/members/${memberId}/attendance-sessions`);
  },

  getMemberAttendanceStats(memberId: string): Promise<AdminMemberAttendanceStats> {
    return requestJson<AdminMemberAttendanceStats>(`/api/admin/members/${memberId}/attendance-stats`);
  },

  updateMember(memberId: string, input: CreateMemberInput): Promise<AdminMember> {
    return requestJson<AdminMember>(`/api/admin/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  deleteMember(memberId: string): Promise<void> {
    return requestJson<void>(`/api/admin/members/${memberId}`, {
      method: "DELETE",
    });
  },
};

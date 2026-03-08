import { requestJson } from "./apiClient";
import type { AdminMember, AdminSessionDashboard, AdminSessionListItem, AdminSessionState } from "../types/admin";

export type CreateMemberInput = {
  fullName: string;
  dob?: string;
  bloodType?: string;
  address?: string;
  email?: string;
  mobileNumber?: string;
  active: boolean;
};

export type CreateSessionInput = {
  eventName: string;
  startsAt: string;
  endsAt: string;
  mandatory: boolean;
};

export const adminApi = {
  listSessions(): Promise<AdminSessionListItem[]> {
    return requestJson<AdminSessionListItem[]>("/api/admin/sessions");
  },

  getDashboard(sessionId: string): Promise<AdminSessionDashboard> {
    return requestJson<AdminSessionDashboard>(`/api/admin/sessions/${sessionId}`);
  },

  createSession(input: CreateSessionInput): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  updateSession(sessionId: string, input: CreateSessionInput): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  startSession(sessionId: string): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}/start`, { method: "POST" });
  },

  closeSession(sessionId: string): Promise<AdminSessionState> {
    return requestJson<AdminSessionState>(`/api/admin/sessions/${sessionId}/close`, { method: "POST" });
  },

  deleteSession(sessionId: string): Promise<void> {
    return requestJson<void>(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
  },

  listMembers(query = "", includeInactive = true): Promise<AdminMember[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    params.set("includeInactive", String(includeInactive));
    return requestJson<AdminMember[]>(`/api/admin/members?${params.toString()}`);
  },

  createMember(input: CreateMemberInput): Promise<AdminMember> {
    return requestJson<AdminMember>("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  updateMember(memberId: string, input: CreateMemberInput): Promise<AdminMember> {
    return requestJson<AdminMember>(`/api/admin/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  deleteMember(memberId: string): Promise<void> {
    return requestJson<void>(`/api/admin/members/${memberId}`, { method: "DELETE" });
  },
};

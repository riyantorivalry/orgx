import { requestJson } from "./apiClient";
import type { AdminMember, AdminSessionDashboard, AdminSessionListItem } from "../types/admin";

export const adminApi = {
  listSessions(): Promise<AdminSessionListItem[]> {
    return requestJson<AdminSessionListItem[]>("/api/admin/sessions");
  },

  getDashboard(sessionId: string): Promise<AdminSessionDashboard> {
    return requestJson<AdminSessionDashboard>(`/api/admin/sessions/${sessionId}`);
  },

  listMembers(query = "", includeInactive = true): Promise<AdminMember[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    params.set("includeInactive", String(includeInactive));
    return requestJson<AdminMember[]>(`/api/admin/members?${params.toString()}`);
  },
};

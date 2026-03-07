import { requestJson } from "../lib/http";

export type AdminAuthUser = {
  username: string;
};

export const authApi = {
  login(username: string, password: string): Promise<AdminAuthUser> {
    return requestJson<AdminAuthUser>("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  },

  me(): Promise<AdminAuthUser> {
    return requestJson<AdminAuthUser>("/api/admin/auth/me");
  },

  logout(): Promise<{ message: string }> {
    return requestJson<{ message: string }>("/api/admin/auth/logout", {
      method: "POST",
    });
  },
};

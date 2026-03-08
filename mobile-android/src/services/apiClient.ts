const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080";

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

function withBase(path: string): string {
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export async function requestJson<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, ...requestInit } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(withBase(path), {
      ...requestInit,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(requestInit.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed (${response.status})`);
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const raw = await response.text();
    if (!raw.trim()) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return JSON.parse(raw) as T;
    }

    return raw as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

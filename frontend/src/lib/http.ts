export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

export async function requestJson<T>(input: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 10000, ...requestInit } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...requestInit, signal: controller.signal });
    const payload = await parseBody(response);

    if (!response.ok) {
      const message = extractMessage(payload, `Request failed (${response.status})`);
      throw new ApiError(message, response.status);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  if (!text) {
    return {};
  }
  return { message: text };
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

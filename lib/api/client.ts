// Typed fetch client. Unwraps { data } and throws ApiClientError on { error }.
import type { ApiError } from "@/lib/schemas/common";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let json: { data?: T; error?: ApiError } | null = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok || json?.error) {
    throw new ApiClientError(
      res.status,
      json?.error?.code ?? "INTERNAL",
      json?.error?.message ?? "Request failed",
      json?.error?.details,
    );
  }
  return json!.data as T;
}

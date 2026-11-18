/** Thin fetch wrapper for the `/api` envelope: success `{ data }`, failure `{ error: { code, message, details? } }`. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field-level messages from a 422 (`z.flattenError`). */
  get fieldErrors(): Record<string, string[]> {
    const d = this.details as { fieldErrors?: Record<string, string[]> } | undefined;
    return d?.fieldErrors ?? {};
  }
}

type TokenSource = () => Promise<string | null>;
let tokenSource: TokenSource = async () => null;
export const setTokenSource = (fn: TokenSource) => {
  tokenSource = fn;
};

type Query = Record<string, string | number | boolean | null | undefined>;
interface Options {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  /** Skip the Authorization header (public endpoints). */
  anonymous?: boolean;
}

export const withQuery = (path: string, query?: Query) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const s = params.toString();
  return s ? `${path}?${s}` : path;
};

export async function api<T = unknown>(path: string, { method = "GET", query, body, anonymous }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!anonymous) {
    const token = await tokenSource();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(withQuery(path, query), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(res.status, json?.error?.code ?? "UNKNOWN", json?.error?.message ?? res.statusText, json?.error?.details);
  }
  return json.data as T;
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

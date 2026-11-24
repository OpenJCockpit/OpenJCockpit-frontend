import { parseApiError } from './httpErrors';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

let _authToken: string | null = null;

export function setAuthToken(token: string) {
  _authToken = token;
}

/** Returns a fresh token, or rejects when the session cannot be renewed (the app then re-authenticates). */
export type SessionRefresher = () => Promise<string>;

let _refreshSession: SessionRefresher | null = null;
let _pendingRefresh: Promise<string> | null = null;

/** Registers how a rejected (401) request renews the session; the api lib stays independent of the auth lib. */
export function setSessionRefresher(refresher: SessionRefresher | null) {
  _refreshSession = refresher;
  _pendingRefresh = null;
}

// Concurrent 401s share one refresh.
function refreshSession(refresher: SessionRefresher): Promise<string> {
  if (!_pendingRefresh) {
    _pendingRefresh = refresher()
      .then((token) => {
        setAuthToken(token);
        return token;
      })
      .finally(() => {
        _pendingRefresh = null;
      });
  }
  return _pendingRefresh;
}

/** Returns the localised text for a server error code, or undefined to keep the server's message. */
export type ErrorTranslator = (code: string) => string | undefined;

let _translateError: ErrorTranslator | null = null;

/** Registers how server error codes become localised messages; the api lib stays independent of the i18n instance. */
export function setErrorTranslator(translator: ErrorTranslator | null) {
  _translateError = translator;
}

export function authHeaders(): HeadersInit {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

/** Synthetic `ApiError.code` for a gateway failure: the backend behind the proxy is down or unreachable. */
export const SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE';
const GATEWAY_STATUSES = [502, 503, 504];

/** A non-2xx response; `status` lets callers tell a deterministic server failure from a network error. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Server `ApiErrorResponse.code`, e.g. `NAME_CONFLICT`. */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: string;
  /** JSON-serialised and sent with a `Content-Type: application/json` header. */
  body?: unknown;
  /** Aborts the request, e.g. when the effect that started it is cleaned up. */
  signal?: AbortSignal;
  /**
   * Fallback error message for a non-2xx response without a server message ("<message>: <status>").
   * A function picks the message from the status.
   */
  errorMessage: string | ((status: number) => string);
}

// Authenticated request. Rejects on network errors, aborts and non-2xx responses,
// so callers can tell "failed" from "empty". Pass `signal` from an effect's AbortController.
async function apiFetch(
  path: string,
  { method, body, signal, errorMessage }: RequestOptions,
): Promise<Response> {
  const send = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  let response = await send();
  // A stale token (e.g. after a throttled background tab): renew once and retry before failing.
  if (response.status === 401 && _refreshSession) {
    await refreshSession(_refreshSession);
    response = await send();
  }
  if (!response.ok) {
    const fallback =
      typeof errorMessage === 'function' ? errorMessage(response.status) : errorMessage;
    const parsed = await parseApiError(response, fallback);
    // A gateway answer (nginx 502/503/504, an HTML body) carries no server code: the backend is not reachable.
    const code =
      parsed.code ?? (GATEWAY_STATUSES.includes(response.status) ? SERVICE_UNAVAILABLE : undefined);
    // Known codes are shown in the active language; unknown codes keep the server's message.
    const localised = code ? _translateError?.(code) : undefined;
    throw new ApiError(localised ?? parsed.message, response.status, code);
  }
  return response;
}

/** Authenticated JSON request; resolves with the parsed response body. */
export async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  return (await apiFetch(path, options)).json();
}

/** A downloaded file: the bytes plus the filename the server suggested (undefined when it sent none). */
export interface BlobResponse {
  blob: Blob;
  filename?: string;
}

/**
 * Filename from a `Content-Disposition` header (RFC 6266): `filename*=UTF-8''...` wins over
 * `filename="..."`. Path separators are dropped so the name is safe to hand to a download.
 */
export function filenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  let name: string | undefined;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      name = decodeURIComponent(encoded.trim());
    } catch {
      name = undefined;
    }
  }
  name ??=
    /filename\s*=\s*"([^"]*)"/i.exec(header)?.[1] ?? /filename\s*=\s*([^;]+)/i.exec(header)?.[1];
  const safe = name?.split(/[\\/]/).pop()?.trim();
  return safe || undefined;
}

/**
 * Authenticated download with the same auth, 401 refresh and error handling as `apiRequest`.
 * A plain link cannot send the Bearer header, so the caller saves the returned Blob.
 */
export async function apiRequestBlob(path: string, options: RequestOptions): Promise<BlobResponse> {
  const response = await apiFetch(path, options);
  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(response.headers.get('Content-Disposition')),
  };
}

/** Like `apiRequest` for endpoints that answer without a body (DELETE, activate, ...). */
export async function apiRequestVoid(path: string, options: RequestOptions): Promise<void> {
  await apiFetch(path, options);
}

/** True when the backend could not be reached: a gateway failure (502/503/504), not a failure the backend reported. */
export function isServiceUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.code === SERVICE_UNAVAILABLE;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

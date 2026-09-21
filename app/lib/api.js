import { API_URL } from "./config";

/**
 * Thin wrapper around fetch for the mail API.
 * - always sends cookies
 * - pass `json` to send a JSON body (sets Content-Type + stringifies)
 * Returns the raw Response, same as fetch.
 */
export function apiFetch(path, { json, headers, ...options } = {}) {
  const hasJson = json !== undefined;

  return fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: hasJson
      ? { "Content-Type": "application/json", ...headers }
      : headers,
    body: hasJson ? JSON.stringify(json) : options.body,
  });
}

/** Pull a readable error message out of a failed response. */
export async function errorFromResponse(response, fallback) {
  const data = await response.json().catch(() => null);
  return data?.message || data?.error || fallback;
}

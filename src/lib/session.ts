'use client';

/**
 * Client session id used to scope saved run history to this browser. Persisted
 * in localStorage under `scout_session`; sent as the `x-scout-session` header
 * on every /api/runs request so visitors only see/affect their own runs on the
 * shared instance. Not auth — just a per-browser partition key.
 */
const SESSION_KEY = 'scout_session';

let cached: string | null = null;

function generate(): string {
  // URL-safe token, ~22 chars; matches the server's [A-Za-z0-9._-]{8,100} guard.
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `s_${rand}`;
}

export function getSessionId(): string {
  if (cached) return cached;
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) {
      cached = existing;
      return existing;
    }
    const fresh = generate();
    localStorage.setItem(SESSION_KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // localStorage unavailable — fall back to an ephemeral per-tab id.
    cached = cached ?? generate();
    return cached;
  }
}

/** Header object to spread into fetch() calls that touch run history. */
export function sessionHeader(): Record<string, string> {
  return { 'x-scout-session': getSessionId() };
}

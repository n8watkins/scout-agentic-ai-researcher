import type { NextRequest } from 'next/server';

/** First client IP from proxy headers, or 'unknown'. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Client-generated session id (localStorage `scout_session`), sent in the
 * `x-scout-session` header. Run history is scoped to it so visitors on the
 * shared instance only see/affect their own runs. Sanitized to a safe token.
 */
export function sessionId(req: NextRequest): string | null {
  const raw = req.headers.get('x-scout-session')?.trim();
  if (!raw) return null;
  if (raw.length < 8 || raw.length > 100) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(raw)) return null;
  return raw;
}

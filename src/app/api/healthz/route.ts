export const runtime = 'nodejs';

/** GET /api/healthz — liveness probe. */
export async function GET() {
  return Response.json({ ok: true, service: 'scout', ts: Date.now() });
}

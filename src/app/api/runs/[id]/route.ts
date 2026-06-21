import { NextRequest } from 'next/server';
import { deleteRun, getRun } from '@/lib/db';
import { allowRunWrite } from '@/lib/usage';
import { clientIp, sessionId } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/runs/[id] — fetch one saved run (only if it belongs to the session). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sid = sessionId(req);
  if (!sid) return Response.json({ error: 'Run not found' }, { status: 404 });
  const { id } = await ctx.params;
  const run = await getRun(id, sid);
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  return Response.json({ run });
}

/** DELETE /api/runs/[id] — remove a saved run owned by the caller's session. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sid = sessionId(req);
  if (!sid) return Response.json({ error: 'Missing session id' }, { status: 400 });
  if (!allowRunWrite(sid || clientIp(req))) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { id } = await ctx.params;
  await deleteRun(id, sid);
  return Response.json({ ok: true });
}

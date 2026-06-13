import { NextRequest } from 'next/server';
import { deleteRun, getRun } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/runs/[id] — fetch one saved run with full detail. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const run = getRun(id);
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  return Response.json({ run });
}

/** DELETE /api/runs/[id] — remove a saved run. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteRun(id);
  return Response.json({ ok: true });
}

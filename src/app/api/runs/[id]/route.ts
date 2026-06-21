import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { deleteRun, getRun } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ownerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** GET /api/runs/[id] — fetch one saved run owned by the signed-in user. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: 'Run not found' }, { status: 404 });
  const { id } = await ctx.params;
  const run = await getRun(id, owner);
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  return Response.json({ run });
}

/** DELETE /api/runs/[id] — remove a saved run owned by the signed-in user. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  await deleteRun(id, owner);
  return Response.json({ ok: true });
}

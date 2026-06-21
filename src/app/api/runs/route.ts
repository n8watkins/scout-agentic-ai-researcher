import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { listRuns, saveRun } from '@/lib/db';
import type { SavedRun } from '@/lib/agent/types';
import { logger } from '@/lib/logger';
import { allowRunWrite } from '@/lib/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Payload caps — keep saved runs sane and cheap to store.
const MAX_QUESTION = 500;
const MAX_REPORT = 100_000;
const MAX_STEPS = 200;
const MAX_CITATIONS = 100;

/** The signed-in user's stable id, or null. Anonymous users persist locally. */
async function ownerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** GET /api/runs — list the signed-in user's saved runs (most recent first). */
export async function GET() {
  const owner = await ownerId();
  if (!owner) return Response.json({ runs: [] });
  try {
    return Response.json({ runs: await listRuns(owner) });
  } catch (err) {
    logger.error('listRuns failed', { err: String(err) });
    return Response.json({ runs: [] });
  }
}

/** POST /api/runs — save a completed run for the signed-in user. */
export async function POST(req: NextRequest) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: 'Sign in to sync runs' }, { status: 401 });

  if (!allowRunWrite(owner)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Partial<SavedRun>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id || !body.question || typeof body.report !== 'string') {
    return Response.json({ error: 'Missing required run fields' }, { status: 400 });
  }
  if (
    typeof body.question !== 'string' ||
    body.question.length > MAX_QUESTION ||
    body.report.length > MAX_REPORT ||
    (Array.isArray(body.steps) && body.steps.length > MAX_STEPS) ||
    (Array.isArray(body.citations) && body.citations.length > MAX_CITATIONS)
  ) {
    return Response.json({ error: 'Run payload too large' }, { status: 413 });
  }

  const run: SavedRun = {
    id: body.id,
    question: body.question,
    report: body.report,
    citations: body.citations ?? [],
    steps: body.steps ?? [],
    stoppedEarly: !!body.stoppedEarly,
    createdAt: body.createdAt ?? Date.now(),
  };

  try {
    await saveRun(run, owner);
    return Response.json({ ok: true, id: run.id });
  } catch (err) {
    logger.error('saveRun failed', { err: String(err) });
    return Response.json({ error: 'Could not save run' }, { status: 500 });
  }
}

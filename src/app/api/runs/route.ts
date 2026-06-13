import { NextRequest } from 'next/server';
import { listRuns, saveRun } from '@/lib/db';
import type { SavedRun } from '@/lib/agent/types';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/runs — list saved run summaries (most recent first). */
export async function GET() {
  try {
    return Response.json({ runs: listRuns() });
  } catch (err) {
    logger.error('listRuns failed', { err: String(err) });
    return Response.json({ runs: [] });
  }
}

/** POST /api/runs — save a completed run. */
export async function POST(req: NextRequest) {
  let body: Partial<SavedRun>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id || !body.question || typeof body.report !== 'string') {
    return Response.json({ error: 'Missing required run fields' }, { status: 400 });
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
    saveRun(run);
    return Response.json({ ok: true, id: run.id });
  } catch (err) {
    logger.error('saveRun failed', { err: String(err) });
    return Response.json({ error: 'Could not save run' }, { status: 500 });
  }
}

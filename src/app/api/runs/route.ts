import { NextRequest } from 'next/server';
import { listRuns, saveRun } from '@/lib/db';
import type { SavedRun } from '@/lib/agent/types';
import { logger } from '@/lib/logger';
import { allowRunWrite } from '@/lib/usage';
import { clientIp, sessionId } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Payload caps — saved runs render in the sidebar of every owning session, so
// keep them sane and cheap to store.
const MAX_QUESTION = 500;
const MAX_REPORT = 100_000;
const MAX_STEPS = 200;
const MAX_CITATIONS = 100;

/** GET /api/runs — list this session's saved run summaries (most recent first). */
export async function GET(req: NextRequest) {
  const sid = sessionId(req);
  if (!sid) return Response.json({ runs: [] });
  try {
    return Response.json({ runs: listRuns(sid) });
  } catch (err) {
    logger.error('listRuns failed', { err: String(err) });
    return Response.json({ runs: [] });
  }
}

/** POST /api/runs — save a completed run, scoped to the caller's session. */
export async function POST(req: NextRequest) {
  const sid = sessionId(req);
  if (!sid) return Response.json({ error: 'Missing session id' }, { status: 400 });

  if (!allowRunWrite(sid || clientIp(req))) {
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
    saveRun(run, sid);
    return Response.json({ ok: true, id: run.id });
  } catch (err) {
    logger.error('saveRun failed', { err: String(err) });
    return Response.json({ error: 'Could not save run' }, { status: 500 });
  }
}

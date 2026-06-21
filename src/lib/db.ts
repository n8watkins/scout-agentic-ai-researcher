import { createClient, type Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import type { AgentStep, Citation, ChatMessage, SavedRun } from './agent/types';
import { logger } from './logger';

/**
 * libSQL store for saved research runs.
 *
 * Durable when TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) point at a Turso/libSQL
 * database — runs then survive redeploys and cold starts. With no Turso config
 * it falls back to a local SQLite file (file:data/scout.db), which on Render's
 * free tier lives on the ephemeral disk (resets on redeploy — see README).
 *
 * Runs are scoped to a client-generated `session_id` (localStorage) so visitors
 * only ever see and mutate their own history on the shared instance.
 */

let clientPromise: Promise<Client> | null = null;

/** Resolve the DB URL: Turso if configured, else a local SQLite file. */
function resolveDbUrl(): string {
  const turso = process.env.TURSO_DATABASE_URL?.trim();
  if (turso) return turso;
  const dir = path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    logger.warn('Could not create data dir', { err: String(err) });
  }
  return `file:${path.join(dir, 'scout.db')}`;
}

/** Lazily create the client and ensure the schema exists (once). */
function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const url = resolveDbUrl();
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    const client = createClient(authToken ? { url, authToken } : { url });
    await client.execute(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL DEFAULT '',
        question TEXT NOT NULL,
        report TEXT NOT NULL,
        citations TEXT NOT NULL,
        steps TEXT NOT NULL,
        stopped_early INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        chat TEXT NOT NULL DEFAULT '[]'
      )
    `);
    await client.execute(
      `CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id, created_at DESC)`
    );
    // Migrate older tables that predate the chat column.
    const info = await client.execute(`PRAGMA table_info(runs)`);
    if (!info.rows.some((r) => String(r.name) === 'chat')) {
      await client.execute(`ALTER TABLE runs ADD COLUMN chat TEXT NOT NULL DEFAULT '[]'`);
    }
    return client;
  })();
  return clientPromise;
}

type DbRow = Record<string, unknown>;

function rowToRun(row: DbRow): SavedRun {
  return {
    id: String(row.id),
    question: String(row.question),
    report: String(row.report),
    citations: JSON.parse(String(row.citations)) as Citation[],
    steps: JSON.parse(String(row.steps)) as AgentStep[],
    stoppedEarly: Number(row.stopped_early) === 1,
    createdAt: Number(row.created_at),
  };
}

export async function saveRun(run: SavedRun, sessionId: string): Promise<void> {
  const client = await getClient();
  await client.execute({
    sql: `INSERT OR REPLACE INTO runs
            (id, session_id, question, report, citations, steps, stopped_early, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      run.id,
      sessionId,
      run.question,
      run.report,
      JSON.stringify(run.citations),
      JSON.stringify(run.steps),
      run.stoppedEarly ? 1 : 0,
      run.createdAt,
    ],
  });
}

export interface RunSummary {
  id: string;
  question: string;
  stoppedEarly: boolean;
  createdAt: number;
}

/** List run summaries for one session only (most recent first). */
export async function listRuns(sessionId: string, limit = 50): Promise<RunSummary[]> {
  const client = await getClient();
  const rs = await client.execute({
    sql: `SELECT id, question, stopped_early, created_at FROM runs
          WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [sessionId, limit],
  });
  return rs.rows.map((r) => ({
    id: String(r.id),
    question: String(r.question),
    stoppedEarly: Number(r.stopped_early) === 1,
    createdAt: Number(r.created_at),
  }));
}

/** Fetch one run, but only if it belongs to the given session. */
export async function getRun(id: string, sessionId: string): Promise<SavedRun | null> {
  const client = await getClient();
  const rs = await client.execute({
    sql: `SELECT * FROM runs WHERE id = ? AND session_id = ?`,
    args: [id, sessionId],
  });
  return rs.rows.length ? rowToRun(rs.rows[0] as DbRow) : null;
}

/** Delete one run, scoped to the owning session. */
export async function deleteRun(id: string, sessionId: string): Promise<void> {
  const client = await getClient();
  await client.execute({
    sql: `DELETE FROM runs WHERE id = ? AND session_id = ?`,
    args: [id, sessionId],
  });
}

/** Get the saved follow-up chat thread for a run (owner-scoped). */
export async function getRunChat(id: string, ownerId: string): Promise<ChatMessage[]> {
  const client = await getClient();
  const rs = await client.execute({
    sql: `SELECT chat FROM runs WHERE id = ? AND session_id = ?`,
    args: [id, ownerId],
  });
  if (!rs.rows.length) return [];
  try {
    return JSON.parse(String(rs.rows[0].chat ?? '[]')) as ChatMessage[];
  } catch {
    return [];
  }
}

/** Replace the follow-up chat thread for a run (owner-scoped). */
export async function setRunChat(id: string, ownerId: string, messages: ChatMessage[]): Promise<void> {
  const client = await getClient();
  await client.execute({
    sql: `UPDATE runs SET chat = ? WHERE id = ? AND session_id = ?`,
    args: [JSON.stringify(messages ?? []), id, ownerId],
  });
}

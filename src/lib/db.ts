import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { AgentStep, Citation, SavedRun } from './agent/types';
import { logger } from './logger';

/**
 * better-sqlite3 store for saved research runs. On Render's free tier the disk
 * is ephemeral (see README), so this is convenience persistence, not a system
 * of record — runs survive a page reload, not a redeploy.
 *
 * Runs are scoped to a client-generated `session_id` (localStorage) so visitors
 * only ever see and mutate their own history on the shared instance.
 */

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dataDir = path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    logger.warn('Could not create data dir', { err: String(err) });
  }
  const file = path.join(dataDir, 'scout.db');
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL DEFAULT '',
      question TEXT NOT NULL,
      report TEXT NOT NULL,
      citations TEXT NOT NULL,
      steps TEXT NOT NULL,
      stopped_early INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  // Migrate older DBs that predate session scoping.
  const cols = db.prepare(`PRAGMA table_info(runs)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'session_id')) {
    db.exec(`ALTER TABLE runs ADD COLUMN session_id TEXT NOT NULL DEFAULT ''`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id, created_at DESC)`);
  return db;
}

interface RunRow {
  id: string;
  session_id: string;
  question: string;
  report: string;
  citations: string;
  steps: string;
  stopped_early: number;
  created_at: number;
}

function rowToRun(row: RunRow): SavedRun {
  return {
    id: row.id,
    question: row.question,
    report: row.report,
    citations: JSON.parse(row.citations) as Citation[],
    steps: JSON.parse(row.steps) as AgentStep[],
    stoppedEarly: row.stopped_early === 1,
    createdAt: row.created_at,
  };
}

export function saveRun(run: SavedRun, sessionId: string): void {
  const stmt = getDb().prepare(
    `INSERT OR REPLACE INTO runs (id, session_id, question, report, citations, steps, stopped_early, created_at)
     VALUES (@id, @session_id, @question, @report, @citations, @steps, @stopped_early, @created_at)`
  );
  stmt.run({
    id: run.id,
    session_id: sessionId,
    question: run.question,
    report: run.report,
    citations: JSON.stringify(run.citations),
    steps: JSON.stringify(run.steps),
    stopped_early: run.stoppedEarly ? 1 : 0,
    created_at: run.createdAt,
  });
}

export interface RunSummary {
  id: string;
  question: string;
  stoppedEarly: boolean;
  createdAt: number;
}

/** List run summaries for one session only (most recent first). */
export function listRuns(sessionId: string, limit = 50): RunSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT id, question, stopped_early, created_at FROM runs
       WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(sessionId, limit) as Array<Pick<RunRow, 'id' | 'question' | 'stopped_early' | 'created_at'>>;
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    stoppedEarly: r.stopped_early === 1,
    createdAt: r.created_at,
  }));
}

/** Fetch one run, but only if it belongs to the given session. */
export function getRun(id: string, sessionId: string): SavedRun | null {
  const row = getDb()
    .prepare(`SELECT * FROM runs WHERE id = ? AND session_id = ?`)
    .get(id, sessionId) as RunRow | undefined;
  return row ? rowToRun(row) : null;
}

/** Delete one run, scoped to the owning session. */
export function deleteRun(id: string, sessionId: string): void {
  getDb().prepare(`DELETE FROM runs WHERE id = ? AND session_id = ?`).run(id, sessionId);
}

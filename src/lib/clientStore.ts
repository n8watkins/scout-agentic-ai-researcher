'use client';

import { get, set, del, entries } from 'idb-keyval';
import type { SavedRun, ChatMessage } from './agent/types';

export type { ChatMessage };

/**
 * Client-side, on-device persistence (IndexedDB) for anonymous visitors — the
 * default. Runs and their follow-up chats live in the browser: private (nothing
 * leaves the device), durable across reloads AND server redeploys, no login.
 * Signed-in users sync to the server (Turso) instead — see the auth tier.
 *
 * Storage shape: one entry per run under `run:<id>`, one chat thread per run
 * under `chat:<id>`. Keeping runs as separate keys avoids loading every report
 * body just to render the sidebar list.
 */

const RUN_PREFIX = 'run:';
const CHAT_PREFIX = 'chat:';
/** Cap on-device history so IndexedDB doesn't grow without bound. */
const MAX_RUNS = 50;

export interface RunSummary {
  id: string;
  question: string;
  stoppedEarly: boolean;
  createdAt: number;
}

/** Most-recent-first run summaries for the sidebar. */
export async function listLocalRuns(): Promise<RunSummary[]> {
  try {
    const all = await entries<string, SavedRun>();
    return all
      .filter(([k]) => typeof k === 'string' && k.startsWith(RUN_PREFIX))
      .map(([, r]) => r)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        id: r.id,
        question: r.question,
        stoppedEarly: r.stoppedEarly,
        createdAt: r.createdAt,
      }));
  } catch {
    return [];
  }
}

export async function getLocalRun(id: string): Promise<SavedRun | null> {
  try {
    return (await get<SavedRun>(RUN_PREFIX + id)) ?? null;
  } catch {
    return null;
  }
}

export async function saveLocalRun(run: SavedRun): Promise<void> {
  try {
    await set(RUN_PREFIX + run.id, run);
    // Prune oldest beyond the cap (and their chats).
    const runs = await listLocalRuns();
    for (const stale of runs.slice(MAX_RUNS)) {
      await del(RUN_PREFIX + stale.id);
      await del(CHAT_PREFIX + stale.id);
    }
  } catch {
    /* storage unavailable (private mode / quota) — best effort */
  }
}

export async function deleteLocalRun(id: string): Promise<void> {
  try {
    await del(RUN_PREFIX + id);
    await del(CHAT_PREFIX + id);
  } catch {
    /* ignore */
  }
}

/** Load the saved chat thread for a run (empty if none). */
export async function getLocalChat(runId: string): Promise<ChatMessage[]> {
  try {
    return (await get<ChatMessage[]>(CHAT_PREFIX + runId)) ?? [];
  } catch {
    return [];
  }
}

export async function saveLocalChat(runId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await set(CHAT_PREFIX + runId, messages);
  } catch {
    /* ignore */
  }
}

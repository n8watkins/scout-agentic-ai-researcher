'use client';

import type { SavedRun, ChatMessage } from './agent/types';
import type { RunSummary } from './clientStore';

/**
 * Server-backed persistence (used when signed in). Hits the auth-scoped
 * /api/runs endpoints; identity travels in the NextAuth session cookie, so no
 * extra headers are needed. All calls are best-effort and fail soft.
 */

export async function apiListRuns(): Promise<RunSummary[]> {
  try {
    const res = await fetch('/api/runs');
    if (!res.ok) return [];
    const data = (await res.json()) as { runs?: RunSummary[] };
    return data.runs ?? [];
  } catch {
    return [];
  }
}

export async function apiGetRun(id: string): Promise<SavedRun | null> {
  try {
    const res = await fetch(`/api/runs/${id}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { run?: SavedRun };
    return data.run ?? null;
  } catch {
    return null;
  }
}

export async function apiSaveRun(run: SavedRun): Promise<void> {
  try {
    await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run),
    });
  } catch {
    /* best effort */
  }
}

export async function apiDeleteRun(id: string): Promise<void> {
  try {
    await fetch(`/api/runs/${id}`, { method: 'DELETE' });
  } catch {
    /* best effort */
  }
}

export async function apiGetChat(runId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`/api/runs/${runId}/chat`);
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: ChatMessage[] };
    return data.messages ?? [];
  } catch {
    return [];
  }
}

export async function apiSaveChat(runId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await fetch(`/api/runs/${runId}/chat`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch {
    /* best effort */
  }
}

'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { SavedRun, ChatMessage } from './agent/types';
import {
  listLocalRuns,
  getLocalRun,
  saveLocalRun,
  deleteLocalRun,
  getLocalChat,
  saveLocalChat,
  type RunSummary,
} from './clientStore';
import {
  apiListRuns,
  apiGetRun,
  apiSaveRun,
  apiDeleteRun,
  apiGetChat,
  apiSaveChat,
} from './apiStore';

/**
 * Unified persistence the UI talks to. Signed-in → server (Turso, synced across
 * devices, keyed by the GitHub user id). Signed-out → on-device IndexedDB. The
 * two backends share one interface so components don't branch on auth.
 */
export interface PersistenceStore {
  /** True when reads/writes go to the server (the user is signed in). */
  authed: boolean;
  listRuns(): Promise<RunSummary[]>;
  getRun(id: string): Promise<SavedRun | null>;
  saveRun(run: SavedRun): Promise<void>;
  deleteRun(id: string): Promise<void>;
  getChat(runId: string): Promise<ChatMessage[]>;
  saveChat(runId: string, messages: ChatMessage[]): Promise<void>;
}

const localBackend = {
  listRuns: listLocalRuns,
  getRun: getLocalRun,
  saveRun: saveLocalRun,
  deleteRun: deleteLocalRun,
  getChat: getLocalChat,
  saveChat: saveLocalChat,
};

const serverBackend = {
  listRuns: apiListRuns,
  getRun: apiGetRun,
  saveRun: apiSaveRun,
  deleteRun: apiDeleteRun,
  getChat: apiGetChat,
  saveChat: apiSaveChat,
};

export function usePersistence(): PersistenceStore {
  const { status } = useSession();
  const authed = status === 'authenticated';
  return useMemo(
    () => ({ authed, ...(authed ? serverBackend : localBackend) }),
    [authed]
  );
}

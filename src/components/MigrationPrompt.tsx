'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { listLocalRuns, getLocalRun, getLocalChat } from '@/lib/clientStore';
import { apiSaveRun, apiSaveChat } from '@/lib/apiStore';

const MIGRATED_FLAG = 'scout_migrated';

/**
 * One-time prompt shown right after sign-in if the visitor has on-device runs:
 * offers to import them (and their chats) into the account so they sync across
 * devices. Dismissable; remembers the choice in localStorage.
 */
export default function MigrationPrompt({ onDone }: { onDone?: () => void }) {
  const { status } = useSession();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      setCount(0);
      return;
    }
    try {
      if (localStorage.getItem(MIGRATED_FLAG)) return;
    } catch {
      /* ignore */
    }
    void listLocalRuns().then((r) => setCount(r.length));
  }, [status]);

  if (status !== 'authenticated' || count === 0 || hidden) return null;

  const remember = () => {
    try {
      localStorage.setItem(MIGRATED_FLAG, '1');
    } catch {
      /* ignore */
    }
  };

  const importAll = async () => {
    setBusy(true);
    try {
      const summaries = await listLocalRuns();
      for (const s of summaries) {
        const run = await getLocalRun(s.id);
        if (!run) continue;
        await apiSaveRun(run);
        const chat = await getLocalChat(s.id);
        if (chat.length) await apiSaveChat(s.id, chat);
      }
      remember();
      setHidden(true);
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    remember();
    setHidden(true);
  };

  return (
    <div className="rounded-lg border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 p-2.5 text-xs">
      <p className="text-violet-800 dark:text-violet-200 mb-2">
        Import {count} saved run{count === 1 ? '' : 's'} from this device into your account?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => void importAll()}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="w-3.5 h-3.5" />
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button
          onClick={dismiss}
          disabled={busy}
          className="px-2 py-1 rounded text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

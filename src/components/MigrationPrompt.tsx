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
    <div className="rounded-lg border border-blue-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 p-2.5 text-xs">
      <p className="text-slate-800 dark:text-slate-200 mb-2">
        Import {count} saved run{count === 1 ? '' : 's'} from this device into your account?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => void importAll()}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="w-3.5 h-3.5" />
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button
          onClick={dismiss}
          disabled={busy}
          className="px-2 py-1 rounded text-blue-600 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

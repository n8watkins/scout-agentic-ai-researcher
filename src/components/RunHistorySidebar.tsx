'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ClockIcon,
  TrashIcon,
  InformationCircleIcon,
  KeyIcon,
  PlusIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { type RunSummary } from '@/lib/clientStore';
import { usePersistence } from '@/lib/persistence';
import type { SavedRun } from '@/lib/agent/types';
import { useApiKey } from '@/hooks/useApiKey';
import InlineKeyEntry from './InlineKeyEntry';
import ModelPicker from './ModelPicker';
import SidebarUsageMeter from './UsageMeter';
import ThemeToggle from './ThemeToggle';
import AuthControls from './AuthControls';
import MigrationPrompt from './MigrationPrompt';

interface RunHistorySidebarProps {
  activeRunId: string | null;
  /** Bumped after each completed run so the list refreshes. */
  refreshKey: number;
  onSelectRun: (run: SavedRun) => void;
  onNewRun: () => void;
  onOpenAbout: () => void;
  /** "Under the hood" dev-view state + toggle (lives in page.tsx). */
  devView: boolean;
  onToggleDevView: () => void;
}

export default function RunHistorySidebar({
  activeRunId,
  refreshKey,
  onSelectRun,
  onNewRun,
  onOpenAbout,
  devView,
  onToggleDevView,
}: RunHistorySidebarProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [showKey, setShowKey] = useState(false);
  const { hasApiKey } = useApiKey();
  const store = usePersistence();

  const load = useCallback(async () => {
    setRuns(await store.listRuns());
  }, [store]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleSelect = async (id: string) => {
    const run = await store.getRun(id);
    if (run) onSelectRun(run);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await store.deleteRun(id);
    void load();
  };

  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col bg-slate-50/80 dark:bg-black/40 backdrop-blur border-r border-slate-200 dark:border-slate-900/40 text-slate-900 dark:text-slate-100">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-900/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black shadow-sm">
            S
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white leading-none">Scout</p>
            <p className="text-[11px] text-blue-500 dark:text-blue-300/80">Agentic research</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onNewRun}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New research
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-3">
        <p className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400/80 font-semibold px-1 mb-2 flex items-center gap-1">
          <ClockIcon className="w-3.5 h-3.5" /> Saved runs
        </p>
        {runs.length === 0 ? (
          <p className="text-xs text-blue-500/80 dark:text-blue-400/70 px-1">No saved runs yet. Your completed research will appear here.</p>
        ) : (
          <ul className="space-y-1">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => handleSelect(r.id)}
                  className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2 ${
                    activeRunId === r.id
                      ? 'bg-slate-200 text-slate-900 dark:bg-slate-700/50 dark:text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex-1 line-clamp-2 leading-snug">{r.question}</span>
                  <TrashIcon
                    onClick={(e) => handleDelete(r.id, e)}
                    className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 mt-0.5"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: usage + BYOK + about */}
      <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-900/40">
        <AuthControls />
        <MigrationPrompt onDone={load} />
        <SidebarUsageMeter hasOwnKey={hasApiKey} />

        <ModelPicker />

        <div className="rounded-lg border border-slate-200 dark:border-slate-800/50">
          <button
            onClick={() => setShowKey(!showKey)}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/30 rounded-lg transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <KeyIcon className="w-4 h-4" />
              {hasApiKey ? 'Your key is active' : 'Bring your own key'}
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showKey ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showKey && (
            <div className="px-3 pb-3 pt-1 text-slate-900 dark:text-slate-100">
              <InlineKeyEntry />
            </div>
          )}
        </div>

        {/* "Under the hood" dev-view toggle — off by default, persisted. */}
        <button
          onClick={onToggleDevView}
          aria-pressed={devView}
          className={`w-full inline-flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            devView
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/30 border border-slate-200 dark:border-slate-800/50'
          }`}
          title="Show the model calls, tokens, latency and cost underneath each run"
        >
          <span className="inline-flex items-center gap-1.5">
            <BeakerIcon className="w-4 h-4" />
            Under the hood
          </span>
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              devView ? 'bg-white/30' : 'bg-blue-300 dark:bg-slate-700/60'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                devView ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAbout}
            className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/30 transition-colors"
          >
            <InformationCircleIcon className="w-4 h-4" />
            About Scout
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

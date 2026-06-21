'use client';

import { Bars3Icon, BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import AuthControls from './AuthControls';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenAbout: () => void;
  devView: boolean;
  onToggleDevView: () => void;
}

/** Top bar: mobile menu on the left; pool, dev-panel, About, sign-in, theme on the right. */
export default function Header({ onOpenSidebar, onOpenAbout, devView, onToggleDevView }: HeaderProps) {
  return (
    <header className="flex-none flex items-center gap-2 px-3 md:px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 backdrop-blur">
      <button
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>
      <span className="md:hidden font-bold text-slate-900 dark:text-white">Scout</span>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToggleDevView}
          aria-pressed={devView}
          title="Show the model calls, tokens, latency and cost (Under the hood)"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            devView
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <BeakerIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Under the hood</span>
        </button>

        <button
          onClick={onOpenAbout}
          title="About Scout"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <InformationCircleIcon className="w-4 h-4" />
          <span className="hidden sm:inline">About</span>
        </button>

        <AuthControls />
        <ThemeToggle />
      </div>
    </header>
  );
}

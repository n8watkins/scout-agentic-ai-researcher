'use client';

import { useState } from 'react';
import { LinkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Citation } from '@/lib/agent/types';

/**
 * Numbered source list. Sources animate in one-at-a-time as the agent
 * discovers them (the count ticks up live), and each one's description is
 * collapsed behind a chevron — an accordion, not a wall of snippets.
 */
export default function SourcesPanel({
  citations,
  running = false,
}: {
  citations: Citation[];
  running?: boolean;
}) {
  if (citations.length === 0 && !running) return null;

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-5">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        Sources
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-300 tabular-nums">
          ({citations.length})
        </span>
        {running && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-violet-500 dark:text-violet-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            discovering&hellip;
          </span>
        )}
      </h2>

      {citations.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Looking for sources&hellip;</p>
      ) : (
        <ol className="space-y-2">
          {citations.map((c) => (
            <SourceItem key={c.index} citation={c} />
          ))}
        </ol>
      )}
    </div>
  );
}

/** One source row: always-visible title/host, snippet tucked into an accordion. */
function SourceItem({ citation: c }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  const hasSnippet = Boolean(c.snippet);

  return (
    <li
      id={`source-${c.index}`}
      className="source-in rounded-lg border border-violet-100 dark:border-violet-900/40"
    >
      <div className="flex gap-3 p-2.5">
        <span className="flex-shrink-0 w-6 h-6 rounded-md bg-violet-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {c.index}
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-violet-700 dark:text-violet-300 hover:underline flex items-center gap-1 break-words"
          >
            {faviconFor(c.url)}
            {c.title || c.url}
          </a>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
            <LinkIcon className="w-3 h-3 flex-shrink-0" />
            {hostOf(c.url)}
          </p>
        </div>
        {hasSnippet && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Hide preview' : 'Show preview'}
            className="flex-shrink-0 self-start mt-0.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {open && hasSnippet && (
        <p className="px-2.5 pb-2.5 -mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {c.snippet}
        </p>
      )}
    </li>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function faviconFor(url: string) {
  const host = hostOf(url);
  if (!host || host === url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
      alt=""
      width={16}
      height={16}
      className="w-4 h-4 rounded-sm flex-shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

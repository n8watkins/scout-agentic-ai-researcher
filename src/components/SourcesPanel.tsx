'use client';

import { LinkIcon } from '@heroicons/react/24/outline';
import type { Citation } from '@/lib/agent/types';

/** Numbered source list with favicons + links. Citation chips scroll here. */
export default function SourcesPanel({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-5">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
        Sources <span className="text-sm font-normal text-gray-400">({citations.length})</span>
      </h2>
      <ol className="space-y-3">
        {citations.map((c) => (
          <li
            key={c.index}
            id={`source-${c.index}`}
            className="flex gap-3 rounded-lg p-2 -mx-2 transition-shadow"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-violet-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {c.index}
            </span>
            <div className="min-w-0">
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
              {c.snippet && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{c.snippet}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
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

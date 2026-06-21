'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Citation } from '@/lib/agent/types';

interface ReportViewProps {
  report: string;
  citations: Citation[];
  stoppedEarly: boolean;
  /** True while the report is still streaming in — shows a typewriter cursor. */
  streaming?: boolean;
}

/**
 * The answer, rendered plainly (no card chrome). Inline [n] markers become
 * clickable chips that scroll to — and open — the matching source.
 */
export default function ReportView({ report, citations, stoppedEarly, streaming }: ReportViewProps) {
  const validIndexes = useMemo(() => new Set(citations.map((c) => c.index)), [citations]);

  if (!report) return null;

  return (
    <div>
      {stoppedEarly && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 mb-3 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
          <ExclamationTriangleIcon className="w-3.5 h-3.5" />
          Stopped early (step budget reached)
        </span>
      )}
      <div className="markdown-content text-slate-800 dark:text-slate-200">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p>{renderCitations(children, validIndexes)}</p>,
            li: ({ children }) => <li>{renderCitations(children, validIndexes)}</li>,
          }}
        >
          {report}
        </ReactMarkdown>
        {streaming && <span className="typing-cursor" aria-hidden="true" />}
      </div>
    </div>
  );
}

/**
 * Walk React children and replace [n] markers in text with anchor chips that
 * scroll to, highlight, and open the matching source (#source-n).
 */
function renderCitations(children: React.ReactNode, valid: Set<number>): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child;
    const parts: React.ReactNode[] = [];
    const regex = /\[(\d+)\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(child)) !== null) {
      const n = Number(m[1]);
      if (m.index > last) parts.push(child.slice(last, m.index));
      if (valid.has(n)) {
        parts.push(
          <a
            key={`c-${key++}`}
            href={`#source-${n}`}
            className="citation-link"
            onClick={(e) => {
              e.preventDefault();
              // The matching source opens, scrolls itself into view, and
              // highlights (handles the independently-scrolling sources column).
              window.dispatchEvent(new CustomEvent('scout:open-source', { detail: n }));
            }}
          >
            {n}
          </a>
        );
      } else {
        parts.push(m[0]);
      }
      last = regex.lastIndex;
    }
    if (last < child.length) parts.push(child.slice(last));
    return parts;
  });
}

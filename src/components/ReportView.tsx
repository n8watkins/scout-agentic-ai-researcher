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
  question: string;
  /** True while the report is still streaming in — shows a typewriter cursor. */
  streaming?: boolean;
}

/**
 * Final report with inline numbered citations [n] rendered as clickable chips
 * that scroll to the matching entry in SourcesPanel.
 */
export default function ReportView({ report, citations, stoppedEarly, question, streaming }: ReportViewProps) {
  const validIndexes = useMemo(() => new Set(citations.map((c) => c.index)), [citations]);

  if (!report) return null;

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report</h2>
        {stoppedEarly && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
            Stopped early (step budget reached)
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">&ldquo;{question}&rdquo;</p>

      <div className="markdown-content text-gray-800 dark:text-gray-200">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Render text nodes, converting [n] markers into citation chips.
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
 * Walk React children and replace [n] / [n][m] markers in text with anchor
 * chips that jump to #source-n.
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
              const el = document.getElementById(`source-${n}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-violet-500');
                setTimeout(() => el.classList.remove('ring-2', 'ring-violet-500'), 1600);
              }
            }}
          >
            {n}
          </a>
        );
      } else {
        // Citation number with no registered source — keep the literal text.
        parts.push(m[0]);
      }
      last = regex.lastIndex;
    }
    if (last < child.length) parts.push(child.slice(last));
    return parts;
  });
}

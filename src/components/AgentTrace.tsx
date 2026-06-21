'use client';

import { useEffect, useRef } from 'react';
import StepCard from './StepCard';
import type { AgentStep } from '@/lib/agent/types';
import type { RunStatus } from '@/hooks/useResearchStream';

interface AgentTraceProps {
  steps: AgentStep[];
  status: RunStatus;
  statusLabel: string;
}

const STATUS_SEQUENCE = ['Planning', 'Thinking', 'Searching', 'Reading', 'Writing'];

/** The live step timeline — the star of the show. Steps animate in as they arrive. */
export default function AgentTrace({ steps, status, statusLabel }: AgentTraceProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [steps.length, statusLabel]);

  const running = status === 'running';
  const visible = steps.filter((s) => s.type !== 'answer' && s.type !== 'done' && s.type !== 'status');

  if (visible.length === 0 && !running) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-900/50 bg-white dark:bg-gray-900/50 backdrop-blur p-5">
      {/* Cycling status line — the anti-spinner */}
      {running && (
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-900/40">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-blue-300">
            {statusLabel || 'Working'}…
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {STATUS_SEQUENCE.map((s) => (
              <span
                key={s}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  s === statusLabel
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        {visible.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import StepCard from './StepCard';
import type { AgentStep } from '@/lib/agent/types';
import type { RunStatus } from '@/hooks/useResearchStream';

interface AgentTraceProps {
  steps: AgentStep[];
  status: RunStatus;
  statusLabel: string;
}

/** Smoothly-animated collapsible region (grid-rows trick). */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-all duration-200 ease-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Scout's process. Collapsed by default to a single row that — while running —
 * shows a LIVE readout of what Scout is doing right now (planning / searching /
 * reading / thinking), updating as it goes. Expand for the full step timeline.
 */
export default function AgentTrace({ steps, status, statusLabel }: AgentTraceProps) {
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [steps.length, statusLabel, open]);

  const running = status === 'running';
  const visible = steps.filter((s) => s.type !== 'answer' && s.type !== 'done' && s.type !== 'status');
  if (visible.length === 0 && !running) return null;

  // Live one-liner: the most recent activity, so the collapsed view shows what
  // Scout is planning/doing right now and updates as the steps stream in.
  const last = visible[visible.length - 1];
  let live = `${statusLabel || 'Working'}…`;
  if (last) {
    if (last.type === 'tool_call' && last.label) live = last.label;
    else if (last.type === 'observation' && last.label) live = last.label;
    else if (last.type === 'thought' && last.content) live = last.content;
    else if (last.type === 'plan') live = last.content ? `Planning: ${last.content}` : 'Planning…';
  }

  const searches = steps.filter((s) => s.type === 'tool_call' && s.toolCall?.name === 'web_search').length;
  const reads = steps.filter((s) => s.type === 'tool_call' && s.toolCall?.name === 'fetch_url').length;
  const doneSummary =
    [
      steps.some((s) => s.type === 'plan') ? 'Planned' : null,
      searches ? `${searches} search${searches > 1 ? 'es' : ''}` : null,
      reads ? `${reads} read${reads > 1 ? 's' : ''}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Process';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={open}
      >
        {running ? (
          <>
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{live}</span>
          </>
        ) : (
          <>
            <span className="flex-shrink-0 text-green-500 text-sm">✓</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-shrink-0">
              Scout&apos;s process
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{doneSummary}</span>
          </>
        )}
        <ChevronDownIcon
          className={`w-4 h-4 ml-auto flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <Collapse open={open}>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {visible.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
          <div ref={endRef} />
        </div>
      </Collapse>
    </div>
  );
}

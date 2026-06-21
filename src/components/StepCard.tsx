'use client';

import { useState } from 'react';
import {
  LightBulbIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { AgentStep } from '@/lib/agent/types';

/** Smoothly-animated collapsible region (grid-rows trick — no height measuring). */
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

/** One step in the live timeline. Compact by default; click to expand details. */
export default function StepCard({ step }: { step: AgentStep }) {
  // Plan opens by default; thinking + observations start compact.
  const [open, setOpen] = useState(step.type === 'plan');

  if (step.type === 'plan') {
    return (
      <Row icon={<ClipboardDocumentListIcon className="w-5 h-5 text-blue-500" />} tone="plan">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          Plan
        </button>
        <Collapse open={open}>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {step.content}
          </p>
        </Collapse>
      </Row>
    );
  }

  if (step.type === 'thought') {
    return (
      <Row icon={<LightBulbIcon className="w-5 h-5 text-amber-400" />} tone="thought">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-start gap-1.5 w-full text-left text-sm italic text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ChevronDownIcon
            className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <span className={open ? 'whitespace-pre-wrap' : 'truncate'}>{step.content}</span>
        </button>
      </Row>
    );
  }

  if (step.type === 'tool_call') {
    const isSearch = step.toolCall?.name === 'web_search';
    return (
      <Row
        icon={
          isSearch ? (
            <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />
          ) : (
            <DocumentTextIcon className="w-5 h-5 text-blue-500" />
          )
        }
        tone="tool"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
          {isSearch ? '🔍' : '📄'} {step.label}
        </span>
      </Row>
    );
  }

  if (step.type === 'observation') {
    return (
      <Row icon={<span className="w-5 h-5 flex items-center justify-center text-green-500">✓</span>} tone="obs">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          {step.label ?? 'Observation'}
        </button>
        <Collapse open={open}>
          <pre className="mt-2 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800 max-h-72 overflow-y-auto">
            {step.content}
          </pre>
        </Collapse>
      </Row>
    );
  }

  if (step.type === 'error') {
    return (
      <Row icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-500" />} tone="error">
        <p className="text-sm text-red-600 dark:text-red-400">{step.content}</p>
      </Row>
    );
  }

  return null;
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="step-in flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm z-10">
          {icon}
        </div>
        <div className="flex-1 w-px bg-slate-200 dark:bg-slate-900/60 my-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">{children}</div>
    </div>
  );
}

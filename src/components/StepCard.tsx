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

/** One step in the live timeline. Each step type gets distinct treatment. */
export default function StepCard({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);

  if (step.type === 'plan') {
    return (
      <Row icon={<ClipboardDocumentListIcon className="w-5 h-5 text-fuchsia-500" />} tone="plan">
        <p className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300 mb-1">Plan</p>
        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
          {step.content}
        </pre>
      </Row>
    );
  }

  if (step.type === 'thought') {
    return (
      <Row icon={<LightBulbIcon className="w-5 h-5 text-amber-400" />} tone="thought">
        <p className="text-sm italic text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
          {step.content}
        </p>
      </Row>
    );
  }

  if (step.type === 'tool_call') {
    const isSearch = step.toolCall?.name === 'web_search';
    return (
      <Row
        icon={
          isSearch ? (
            <MagnifyingGlassIcon className="w-5 h-5 text-violet-500" />
          ) : (
            <DocumentTextIcon className="w-5 h-5 text-violet-500" />
          )
        }
        tone="tool"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-sm font-medium">
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
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          {step.label ?? 'Observation'}
        </button>
        {open && (
          <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap font-sans bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 border border-gray-100 dark:border-gray-800 max-h-72 overflow-y-auto">
            {step.content}
          </pre>
        )}
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
        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 flex items-center justify-center shadow-sm z-10">
          {icon}
        </div>
        <div className="flex-1 w-px bg-violet-200 dark:bg-violet-900/60 my-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">{children}</div>
    </div>
  );
}

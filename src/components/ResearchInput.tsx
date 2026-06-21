'use client';

import { useState } from 'react';
import { SparklesIcon, MagnifyingGlassIcon, StopIcon } from '@heroicons/react/24/outline';
import { randomSampleQuestion } from '@/lib/sampleQuestions';

interface ResearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  onStop: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

/** Question box + "Surprise me" + run/stop button. Cmd/Ctrl+Enter submits. */
export default function ResearchInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isRunning,
  disabled,
}: ResearchInputProps) {
  const [touched, setTouched] = useState(false);

  const submit = () => {
    if (disabled) return;
    const q = value.trim();
    if (!q) {
      setTouched(true);
      return;
    }
    onSubmit(q);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask a hard research question — Scout will plan, search, read, and cite…"
          rows={3}
          disabled={isRunning}
          className="w-full resize-none rounded-2xl border border-violet-300 dark:border-violet-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur px-4 py-3 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-60 shadow-sm"
        />
      </div>

      {touched && !value.trim() && (
        <p className="text-sm text-red-500 mt-1">Type a question to research.</p>
      )}

      <div className="flex items-center justify-between gap-3 mt-3">
        <button
          type="button"
          onClick={() => onChange(randomSampleQuestion(value))}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-50"
        >
          <SparklesIcon className="w-4 h-4" />
          Surprise me
        </button>

        {isRunning ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition-colors"
          >
            <StopIcon className="w-5 h-5" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            Research
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-right">
        ⌘/Ctrl + Enter to run
      </p>
    </div>
  );
}

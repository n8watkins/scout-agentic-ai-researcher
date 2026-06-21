'use client';

import { useRef, useState } from 'react';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  StopIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';
import { randomSampleQuestion } from '@/lib/sampleQuestions';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface ResearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  onStop: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

/** Question box + voice dictation + "Surprise me" + run/stop. Cmd/Ctrl+Enter submits. */
export default function ResearchInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isRunning,
  disabled,
}: ResearchInputProps) {
  const [touched, setTouched] = useState(false);
  const baseRef = useRef('');

  const { supported: micSupported, listening, start, stop } = useSpeechToText((t) => {
    onChange((baseRef.current ? baseRef.current + ' ' : '') + t);
  });

  const submit = () => {
    if (disabled) return;
    const q = value.trim();
    if (!q) {
      setTouched(true);
      return;
    }
    onSubmit(q);
  };

  const toggleMic = () => {
    if (listening) {
      stop();
      return;
    }
    baseRef.current = value.trim();
    start();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
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
          placeholder="Ask a hard research question…"
          rows={2}
          disabled={isRunning}
          className="w-full resize-none rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-4 py-3 pr-14 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 shadow-sm"
        />
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={isRunning}
            aria-label={listening ? 'Stop dictation' : 'Dictate by voice'}
            title={listening ? 'Stop dictation' : 'Dictate by voice'}
            className={`absolute right-2.5 bottom-2.5 inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors disabled:opacity-50 ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
            }`}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {touched && !value.trim() && (
        <p className="text-sm text-red-500 mt-1">Type a question to research.</p>
      )}

      <div className="flex items-center justify-between gap-3 mt-3">
        <button
          type="button"
          onClick={() => onChange(randomSampleQuestion(value))}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 disabled:opacity-50 transition-colors"
        >
          <SparklesIcon className="w-4 h-4" />
          Surprise me
        </button>

        {isRunning ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm transition-colors"
          >
            <StopIcon className="w-5 h-5" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            Research
          </button>
        )}
      </div>
      <p className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 mt-1.5 text-right">
        ⌘/Ctrl + Enter to run
      </p>
    </div>
  );
}

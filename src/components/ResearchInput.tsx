'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SparklesIcon, MagnifyingGlassIcon, StopIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { SUGGESTIONS, randomSampleQuestion, sampleN } from '@/lib/sampleQuestions';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface ResearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  onStop: () => void;
  isRunning: boolean;
  disabled?: boolean;
  /** Show the suggestion chips (kept visible until the first search). */
  showSuggestions?: boolean;
}

/**
 * Single-row composer: dictate + textarea + Research are in line. The textarea
 * is one line until you type more, then grows up to ~14 lines and scrolls.
 * Suggestion chips show below while it's empty. Cmd/Ctrl+Enter submits.
 */
export default function ResearchInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isRunning,
  disabled,
  showSuggestions,
}: ResearchInputProps) {
  const [touched, setTouched] = useState(false);
  const baseRef = useRef('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow: one line by default, grow with content up to ~14 lines, then scroll.
  const autosize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 336)}px`;
  }, []);
  useEffect(() => {
    autosize();
  }, [value, autosize]);

  // A random subset of suggestion chips, reshuffled each mount (i.e., per reload).
  const [picks, setPicks] = useState(() => SUGGESTIONS.slice(0, 6));
  useEffect(() => {
    setPicks(sampleN(SUGGESTIONS, 6));
  }, []);

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
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-end gap-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 shadow-sm px-2 py-1.5 focus-within:border-blue-500 transition-colors">
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={isRunning}
            aria-label={listening ? 'Stop dictation' : 'Dictate by voice'}
            title={listening ? 'Stop dictation' : 'Dictate by voice'}
            className={`flex-none inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors disabled:opacity-50 ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
            }`}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>
        )}

        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask a hard research question…"
          rows={1}
          disabled={isRunning}
          className="flex-1 min-w-0 resize-none bg-transparent px-1.5 py-2 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none disabled:opacity-60 overflow-y-auto max-h-[336px]"
        />

        {isRunning ? (
          <button
            type="button"
            onClick={onStop}
            className="flex-none inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            <StopIcon className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="flex-none inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            Research
          </button>
        )}
      </div>

      {touched && !value.trim() && (
        <p className="text-sm text-red-500 mt-1.5">Type a question to research.</p>
      )}

      {/* Suggestions — stay visible until the first search; clicking runs it */}
      {showSuggestions && !isRunning && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {picks.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                onChange(s.q);
                onSubmit(s.q);
              }}
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const q = randomSampleQuestion();
              onChange(q);
              onSubmit(q);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700/60 dark:hover:bg-slate-800/40 transition-colors"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Surprise me
          </button>
        </div>
      )}
    </div>
  );
}

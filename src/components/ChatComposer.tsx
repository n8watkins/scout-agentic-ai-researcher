'use client';

import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
  error?: string | null;
}

/** Docked follow-up composer for "talk to the report". Enter sends. */
export default function ChatComposer({ value, onChange, onSend, streaming, error }: ChatComposerProps) {
  return (
    <div className="px-3 py-2.5">
      {error && (
        <div className="mb-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask a follow-up about this report…"
          rows={1}
          disabled={streaming}
          className="flex-1 min-w-0 resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3.5 py-2.5 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-60 max-h-32 overflow-y-auto"
        />
        <button
          onClick={onSend}
          disabled={streaming || !value.trim()}
          aria-label="Send"
          className="flex-none inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

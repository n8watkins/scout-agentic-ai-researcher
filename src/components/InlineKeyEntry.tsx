'use client';

import { useState } from 'react';
import { useApiKey } from '@/hooks/useApiKey';

interface InlineKeyEntryProps {
  onSaved?: () => void;
  autoFocus?: boolean;
}

/** "Bring your own free Gemini key" form. Key stays client-side only. */
export default function InlineKeyEntry({ onSaved, autoFocus = false }: InlineKeyEntryProps) {
  const { hasApiKey, saveApiKey, removeApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    if (!inputValue.trim()) {
      setError('Please paste your API key first');
      return;
    }
    try {
      saveApiKey(inputValue);
      setInputValue('');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key.');
    }
  };

  return (
    <div className="space-y-3" data-testid="inline-key-entry">
      {hasApiKey && (
        <div className="flex items-center justify-between gap-2 text-sm text-green-700 dark:text-green-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Your key is active &mdash; research now runs on it.
          </span>
          <button
            onClick={removeApiKey}
            className="text-xs text-slate-400 hover:text-red-500 underline"
          >
            Remove
          </button>
        </div>
      )}

      <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside">
        <li>
          Open{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Google AI Studio
          </a>{' '}
          (free, ~2 minutes)
        </li>
        <li>Click &quot;Create API Key&quot; &mdash; ideally in a fresh project</li>
        <li>Paste it below. It stays in your browser, never on our servers.</li>
      </ol>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="AIza... or AQ..."
            autoFocus={autoFocus}
            className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-blue-600 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-blue-600 transition disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
        >
          {hasApiKey ? 'Update Key' : 'Save Key'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import { MODELS, SHARED_MODEL } from '@/lib/gemini';
import { useModel } from '@/hooks/useModel';
import { useApiKey } from '@/hooks/useApiKey';

/**
 * Model selector for the sidebar settings area. BYOK-tier models are disabled
 * (and labelled) until the visitor adds their own key; if the key disappears
 * while a BYOK model is selected, we reset to the shared model.
 */
export default function ModelPicker() {
  const { model, setModel } = useModel();
  const { hasApiKey } = useApiKey();

  // If a BYOK model is selected but the key is gone, fall back to shared.
  useEffect(() => {
    const selected = MODELS.find((m) => m.id === model);
    if (selected && selected.tier === 'byok' && !hasApiKey) {
      setModel(SHARED_MODEL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey, model]);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800/50">
      <label className="block px-3 pt-2 text-[11px] uppercase tracking-wide font-semibold text-blue-500 dark:text-blue-400/80 flex items-center gap-1.5">
        <CpuChipIcon className="w-3.5 h-3.5" />
        Model
      </label>
      <div className="px-3 pb-2.5 pt-1.5">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          aria-label="Gemini model"
          className="w-full px-2.5 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          {MODELS.map((m) => {
            const locked = m.tier === 'byok' && !hasApiKey;
            return (
              <option key={m.id} value={m.id} disabled={locked}>
                {m.label} &mdash; {m.blurb}
                {m.tier === 'byok' ? ' (needs your own key)' : ''}
              </option>
            );
          })}
        </select>
        {!hasApiKey && (
          <p className="mt-1.5 text-[11px] text-blue-500/80 dark:text-blue-400/70 leading-snug">
            Add your own key to unlock more capable models.
          </p>
        )}
      </div>
    </div>
  );
}

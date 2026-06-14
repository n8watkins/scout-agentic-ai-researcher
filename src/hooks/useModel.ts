'use client';

import { useEffect, useState } from 'react';
import { SHARED_MODEL } from '@/lib/gemini';

/**
 * Selected Gemini model. Persisted in localStorage; defaults to the shared
 * model (the only one safe on the demo pool). SSR-safe — guards `window`.
 */
const STORAGE_KEY = 'scout-model';

export function useModel() {
  const [model, setModelState] = useState<string>(SHARED_MODEL);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setModelState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setModel = (next: string) => {
    setModelState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return { model, setModel };
}

'use client';

import { useEffect, useState } from 'react';

/**
 * "Under the hood" dev-view preference. Off by default; persisted in
 * localStorage. SSR-safe — guards `window`. Mirrors the useModel/useTheme
 * persistence pattern.
 */
const STORAGE_KEY = 'scout-dev-view';

export function useDevView() {
  const [devView, setDevViewState] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setDevViewState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setDevView = (next: boolean) => {
    setDevViewState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const toggle = () => setDevView(!devView);

  return { devView, setDevView, toggle };
}

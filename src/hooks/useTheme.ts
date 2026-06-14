'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Dependency-free theme state. The inline script in layout.tsx sets the `.dark`
 * class before paint (no FOUC); this hook reads that initial class, then lets
 * `toggle()` flip it and persist the choice to localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const apply = (next: Theme) => {
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    root.style.colorScheme = next;
    try {
      localStorage.theme = next;
    } catch {
      /* ignore — localStorage may be unavailable */
    }
    setTheme(next);
  };

  const toggle = () => apply(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggle };
}

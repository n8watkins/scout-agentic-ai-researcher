'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

/**
 * BYOK state. The visitor's Gemini key lives only in localStorage and is sent
 * per-request in the `x-gemini-key` header; it never persists server-side.
 */
export const API_KEY_CHANGED_EVENT = 'scout-api-key-changed';
const STORAGE_KEY = 'scout-gemini-api-key';

function looksLikeKey(key: string): boolean {
  const k = key.trim();
  // Google AI Studio keys are typically "AIza..."; the newer project keys use
  // an "AQ." prefix. Accept a reasonable length rather than over-validating.
  return k.length >= 20 && k.length <= 200 && /^[A-Za-z0-9._\-]+$/.test(k);
}

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setApiKey(stored && looksLikeKey(stored) ? stored : null);
    } catch {
      setApiKey(null);
    } finally {
      setIsLoading(false);
    }

    const handler = () => {
      try {
        setApiKey(localStorage.getItem(STORAGE_KEY));
      } catch {
        setApiKey(null);
      }
    };
    window.addEventListener(API_KEY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(API_KEY_CHANGED_EVENT, handler);
  }, []);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    if (!looksLikeKey(trimmed)) {
      throw new Error('That does not look like a valid Gemini API key.');
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    window.dispatchEvent(new Event(API_KEY_CHANGED_EVENT));
    logger.info('BYOK key saved (client-side only)');
  };

  const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    window.dispatchEvent(new Event(API_KEY_CHANGED_EVENT));
  };

  return { apiKey, hasApiKey: !!apiKey, isLoading, saveApiKey, removeApiKey };
}

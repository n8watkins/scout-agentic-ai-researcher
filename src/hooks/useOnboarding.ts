'use client';

import { useCallback, useEffect, useState } from 'react';

export const ONBOARDING_COMPLETE_KEY = 'scout_onboarding_complete';

const LEGACY_SEEN_KEYS = ['scout-gemini-api-key'];

type StorageLike = Pick<Storage, 'getItem'>;

/** Pure check so the first-run rule is unit-testable. */
export function isOnboardingComplete(storage: StorageLike): boolean {
  if (storage.getItem(ONBOARDING_COMPLETE_KEY)) return true;
  return LEGACY_SEEN_KEYS.some((key) => storage.getItem(key) !== null);
}

/** First-run-only onboarding wizard state (shows exactly once). */
export function useOnboarding() {
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    try {
      if (!isOnboardingComplete(localStorage)) setShowWizard(true);
    } catch {
      /* localStorage unavailable — never block the app */
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch {
      /* best effort */
    }
    setShowWizard(false);
  }, []);

  const reopen = useCallback(() => setShowWizard(true), []);

  return { showWizard, completeOnboarding, reopen };
}

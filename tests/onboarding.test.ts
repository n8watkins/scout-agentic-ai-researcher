import { describe, it, expect } from 'vitest';
import { isOnboardingComplete, ONBOARDING_COMPLETE_KEY } from '@/hooks/useOnboarding';

function fakeStorage(entries: Record<string, string>): Pick<Storage, 'getItem'> {
  return { getItem: (k: string) => (k in entries ? entries[k] : null) };
}

describe('isOnboardingComplete', () => {
  it('is false for a brand-new visitor', () => {
    expect(isOnboardingComplete(fakeStorage({}))).toBe(false);
  });

  it('is true once the completion flag is set', () => {
    expect(isOnboardingComplete(fakeStorage({ [ONBOARDING_COMPLETE_KEY]: 'true' }))).toBe(true);
  });

  it('is true for a returning visitor with a legacy key (grandfathered in)', () => {
    expect(isOnboardingComplete(fakeStorage({ 'scout-gemini-api-key': 'AIzaXXXX' }))).toBe(true);
  });
});

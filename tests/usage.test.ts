import { describe, it, expect } from 'vitest';
import { poolPercentUsed } from '@/hooks/useUsageInfo';
import type { UsageInfo } from '@/hooks/useUsageInfo';

function usage(used: number, budget: number, available = budget - used): UsageInfo {
  return { pool: { used, budget, available, resetAt: Date.now() } };
}

describe('poolPercentUsed', () => {
  it('returns 0 for null / empty / zero-budget input', () => {
    expect(poolPercentUsed(null)).toBe(0);
    expect(poolPercentUsed(usage(0, 0))).toBe(0);
  });

  it('computes a rounded percentage of the call budget', () => {
    expect(poolPercentUsed(usage(0, 250))).toBe(0);
    expect(poolPercentUsed(usage(125, 250))).toBe(50);
    expect(poolPercentUsed(usage(250, 250))).toBe(100);
    expect(poolPercentUsed(usage(63, 250))).toBe(25); // 25.2 → 25
  });

  it('clamps to [0, 100]', () => {
    expect(poolPercentUsed(usage(300, 250))).toBe(100);
    expect(poolPercentUsed(usage(-5, 250))).toBe(0);
  });
});

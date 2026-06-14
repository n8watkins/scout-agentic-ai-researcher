import { describe, it, expect } from 'vitest';
import { estimateCostUsd, PRICING, FALLBACK_RATE } from '@/lib/devtrace';

describe('estimateCostUsd', () => {
  it('applies the §6 per-1M rate for a known model', () => {
    // gemini-2.5-flash: $0.30 in / $2.50 out per 1M.
    // 1M in + 1M out → 0.30 + 2.50 = 2.80
    expect(estimateCostUsd('gemini-2.5-flash', 1_000_000, 1_000_000)).toBeCloseTo(2.8, 10);
  });

  it('scales linearly below 1M tokens', () => {
    // gemini-2.5-flash-lite: $0.10 in / $0.40 out.
    // 500k in + 250k out → 0.05 + 0.10 = 0.15
    expect(estimateCostUsd('gemini-2.5-flash-lite', 500_000, 250_000)).toBeCloseTo(0.15, 10);
  });

  it('uses the shared model rate (gemini-3.1-flash-lite)', () => {
    // $0.25 in / $1.50 out → 0.25 + 1.50 = 1.75 for 1M each.
    expect(estimateCostUsd('gemini-3.1-flash-lite', 1_000_000, 1_000_000)).toBeCloseTo(1.75, 10);
  });

  it('falls back to FALLBACK_RATE for an unknown model', () => {
    const got = estimateCostUsd('totally-made-up-model', 1_000_000, 1_000_000);
    const expected = FALLBACK_RATE.in + FALLBACK_RATE.out;
    expect(got).toBeCloseTo(expected, 10);
  });

  it('returns 0 for zero tokens', () => {
    expect(estimateCostUsd('gemini-2.5-flash', 0, 0)).toBe(0);
  });

  it('treats negative / non-finite token counts as 0', () => {
    expect(estimateCostUsd('gemini-2.5-flash', -5, 100)).toBeCloseTo((100 / 1e6) * 2.5, 12);
    expect(estimateCostUsd('gemini-2.5-flash', NaN, NaN)).toBe(0);
    expect(estimateCostUsd('gemini-2.5-flash', Infinity, 0)).toBe(0);
  });

  it('every model in PRICING produces a positive cost for nonzero tokens', () => {
    for (const model of Object.keys(PRICING)) {
      expect(estimateCostUsd(model, 1000, 1000)).toBeGreaterThan(0);
    }
  });
});

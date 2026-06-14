import { describe, it, expect } from 'vitest';
import { pickModel, DEFAULT_MODEL, SHARED_MODEL, MODELS } from '@/lib/gemini';

describe('pickModel (server-side allowlist + BYOK gate)', () => {
  it('allows the shared model without a BYOK key', () => {
    expect(pickModel(SHARED_MODEL, false)).toBe(SHARED_MODEL);
  });

  it('rejects a BYOK-tier model without a key, falling back to the default', () => {
    const byokModel = MODELS.find((m) => m.tier === 'byok')!;
    expect(pickModel(byokModel.id, false)).toBe(DEFAULT_MODEL);
  });

  it('allows a BYOK-tier model when a key is present', () => {
    const byokModel = MODELS.find((m) => m.tier === 'byok')!;
    expect(pickModel(byokModel.id, true)).toBe(byokModel.id);
  });

  it('rejects unknown / spoofed model ids regardless of BYOK', () => {
    expect(pickModel('gpt-4o', true)).toBe(DEFAULT_MODEL);
    expect(pickModel('gemini-3-flash', true)).toBe(DEFAULT_MODEL); // bare id does not exist
    expect(pickModel(undefined, true)).toBe(DEFAULT_MODEL);
    expect(pickModel('', false)).toBe(DEFAULT_MODEL);
  });
});

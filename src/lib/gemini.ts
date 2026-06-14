import { GoogleGenAI } from '@google/genai';

/**
 * Model + key resolution. A run may use the visitor's own key (BYOK, sent in
 * the request header) or fall back to the shared server demo key. The demo key
 * lives only in the environment and is never returned to the client.
 */

export const SHARED_MODEL = 'gemini-3.1-flash-lite';

export const DEFAULT_MODEL = process.env.SCOUT_MODEL || SHARED_MODEL;

export type ModelTier = 'shared' | 'byok';

export interface ModelOption {
  id: string;
  label: string;
  tier: ModelTier;
  blurb: string;
}

/**
 * The models Scout offers, ordered shared-first. Only `tier: 'shared'` models
 * are safe on the shared demo pool (tight free-tier limits); the rest are
 * unlocked only when a visitor brings their own key. All support function
 * calling, so Scout's research tools keep working on any of them.
 */
export const MODELS: ModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    tier: 'shared',
    blurb: 'Fast & free',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    tier: 'byok',
    blurb: 'Lightweight',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tier: 'byok',
    blurb: 'Balanced',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    tier: 'byok',
    blurb: 'Preview',
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    tier: 'byok',
    blurb: 'Most capable',
  },
];

/**
 * Server-side allowlist + BYOK gate (defense-in-depth — never trust the client).
 * Returns `requested` only if it is a known model AND either its tier is
 * 'shared' or the run has a BYOK key. Otherwise falls back to the env default.
 */
export function pickModel(requested: string | undefined, byok: boolean): string {
  const match = MODELS.find((m) => m.id === requested);
  if (match && (match.tier === 'shared' || byok)) {
    return match.id;
  }
  return DEFAULT_MODEL;
}

export interface KeyResolution {
  apiKey: string;
  byok: boolean;
}

/**
 * Resolve which key a run should use. A non-empty BYOK key always wins.
 * Returns null when neither a BYOK key nor a demo key is available.
 */
export function resolveApiKey(byokKey: string | null | undefined): KeyResolution | null {
  const trimmed = byokKey?.trim();
  if (trimmed) {
    return { apiKey: trimmed, byok: true };
  }
  const demo = process.env.GEMINI_API_KEY?.trim();
  if (demo) {
    return { apiKey: demo, byok: false };
  }
  return null;
}

/** Build a @google/genai client for a given key. */
export function makeClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

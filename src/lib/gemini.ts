import { GoogleGenAI } from '@google/genai';

/**
 * Model + key resolution. A run may use the visitor's own key (BYOK, sent in
 * the request header) or fall back to the shared server demo key. The demo key
 * lives only in the environment and is never returned to the client.
 */

export const DEFAULT_MODEL = process.env.SCOUT_MODEL || 'gemini-3.1-flash-lite';

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

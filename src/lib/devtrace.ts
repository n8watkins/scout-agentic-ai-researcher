/**
 * Shared developer-telemetry model — the "Under the Hood" X-ray layer.
 *
 * These events are PURELY ADDITIVE: the agent loop emits them alongside the
 * visible ReAct steps it already produces. They carry the real model I/O,
 * token counts, latency and an estimated cost (from the pricing table below)
 * so the dev panel can show what's actually happening underneath the product.
 *
 * The TraceEvent schema is shared (in shape) with Echo's dev-panel telemetry.
 * Scout only emits `model_call`, `tool_exec` and `stage` today;
 * `state` is kept for cross-app parity.
 */

/** Which phase of the loop a model call belongs to (for waterfall coloring). */
export type ModelCallPhase = 'plan' | 'react-step' | 'summarize' | 'synthesize' | string;

export type TraceEvent =
  | {
      kind: 'model_call';
      id: string;
      phase: ModelCallPhase;
      model: string;
      startedAt: number;
      endedAt: number;
      tokensIn: number;
      tokensOut: number;
      costUsd: number;
      /** The exact `contents` sent (serialized) — behind a "show raw" accordion. */
      prompt?: string;
      /** The raw model response text — behind a "show raw" accordion. */
      rawResponse?: string;
      /** The function call the model returned this turn, if any. */
      toolCall?: { name: string; args: unknown } | null;
    }
  | {
      kind: 'tool_exec';
      id: string;
      name: string; // 'web_search' | 'fetch_url'
      args: unknown;
      startedAt: number;
      endedAt: number;
      ok: boolean;
      /** Raw provider result, BEFORE summarization. */
      rawResult?: unknown;
    }
  | {
      kind: 'stage';
      id: string;
      label: string;
      startedAt: number;
      endedAt: number;
    }
  | {
      kind: 'state';
      machine: 'turn' | 'react';
      from: string;
      to: string;
      at: number;
    };

/**
 * Per-1M-token paid rates (§6, verified 2026-06-14). Used only for the
 * illustrative "what this would cost at scale" readout — the demo runs on the
 * free tier. Unknown models fall back to a conservative flash-lite-ish rate.
 */
export interface ModelRate {
  in: number;
  out: number;
}

export const PRICING: Record<string, ModelRate> = {
  'gemini-3.1-flash-lite': { in: 0.25, out: 1.5 },
  'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
  'gemini-2.5-flash': { in: 0.3, out: 2.5 },
  'gemini-3-flash-preview': { in: 0.5, out: 3.0 },
  'gemini-3.5-flash': { in: 1.5, out: 9.0 },
};

/** Rate used when a model id isn't in the table (keeps the readout non-zero). */
export const FALLBACK_RATE: ModelRate = { in: 0.25, out: 1.5 };

/**
 * Estimated USD cost for a single call:
 *   tokensIn/1e6 * inRate + tokensOut/1e6 * outRate
 * Negative or non-finite token counts are treated as 0.
 */
export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const rate = PRICING[model] ?? FALLBACK_RATE;
  const safeIn = Number.isFinite(tokensIn) && tokensIn > 0 ? tokensIn : 0;
  const safeOut = Number.isFinite(tokensOut) && tokensOut > 0 ? tokensOut : 0;
  return (safeIn / 1e6) * rate.in + (safeOut / 1e6) * rate.out;
}

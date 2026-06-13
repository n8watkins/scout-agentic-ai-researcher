/**
 * In-memory shared demo-pool accounting, budgeted by ACTUAL MODEL CALLS.
 *
 * A single research run fires many Gemini calls (1 plan + up to ~8 decide +
 * up to ~7 summarize + 1 synthesis ≈ 15), so budgeting in *runs* drains a
 * shared free-tier key in under an hour. We instead count every model call and
 * cap the demo key at MODEL_CALL_BUDGET calls per rolling 24h window. The
 * shared Gemini key is used by TWO portfolio apps (this + the voice agent), so
 * this app gets half of a 500/day key → 250 calls/day.
 *
 * This is process-local and in-memory: it resets on a cold start / redeploy and
 * is NOT shared across instances. A durable cross-instance cap would live in an
 * external KV (e.g. Upstash Redis); intentionally not added here to keep the
 * demo dependency-free. The per-IP limit below is a light abuse guard; the
 * daily call-cap is the real ceiling.
 */

// Real ceiling: demo Gemini calls per rolling 24h window.
const MODEL_CALL_BUDGET = Number(process.env.SCOUT_DEMO_CALL_BUDGET ?? 250);
const CALL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h rolling

// Light per-IP abuse guard (in *runs started*, not model calls).
const PER_IP_LIMIT = Number(process.env.SCOUT_PER_IP_RUN_LIMIT ?? 8);
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface CallPoolState {
  calls: number;
  windowStart: number;
}

const callPool: CallPoolState = { calls: 0, windowStart: Date.now() };
const perIp = new Map<string, { count: number; windowStart: number }>();

function rollCallPool() {
  const now = Date.now();
  if (now - callPool.windowStart >= CALL_WINDOW_MS) {
    callPool.calls = 0;
    callPool.windowStart = now;
  }
}

export interface UsageSnapshot {
  pool: {
    /** Model calls consumed this window. */
    used: number;
    /** Model-call budget for the window. */
    budget: number;
    available: number;
    resetAt: number;
  };
}

export function getUsageSnapshot(): UsageSnapshot {
  rollCallPool();
  return {
    pool: {
      used: callPool.calls,
      budget: MODEL_CALL_BUDGET,
      available: Math.max(0, MODEL_CALL_BUDGET - callPool.calls),
      resetAt: callPool.windowStart + CALL_WINDOW_MS,
    },
  };
}

/**
 * Record one demo-key Gemini call. Called from the agent loop on EVERY model
 * call (plan, each decide, each summarize, synthesis). BYOK calls must NOT call
 * this. No-op once over budget — a run already in progress is allowed to finish.
 */
export function recordDemoModelCall(): void {
  rollCallPool();
  callPool.calls += 1;
}

/** True if the demo model-call budget for this window is already used up. */
export function isDemoCallBudgetExhausted(): boolean {
  rollCallPool();
  return callPool.calls >= MODEL_CALL_BUDGET;
}

export interface PoolCheck {
  allowed: boolean;
  reason?: 'pool_exhausted' | 'ip_limit';
}

/**
 * Gate the START of a demo run for the given IP. BYOK runs should NOT call this.
 *  - Rejects if the daily model-call cap is already reached (the real ceiling).
 *  - Rejects if this IP has started too many runs this hour (abuse guard).
 * The actual model-call counter is incremented later, per call, in the loop.
 */
export function reserveDemoRun(ip: string): PoolCheck {
  rollCallPool();
  const now = Date.now();

  if (callPool.calls >= MODEL_CALL_BUDGET) {
    return { allowed: false, reason: 'pool_exhausted' };
  }

  const ipState = perIp.get(ip);
  if (!ipState || now - ipState.windowStart >= IP_WINDOW_MS) {
    perIp.set(ip, { count: 0, windowStart: now });
  }
  const cur = perIp.get(ip)!;
  if (cur.count >= PER_IP_LIMIT) {
    return { allowed: false, reason: 'ip_limit' };
  }

  cur.count += 1;
  return { allowed: true };
}

// --- Run-history write rate limit (abuse guard for POST/DELETE /api/runs) ----
// Keyed by session id (falling back to IP), a simple fixed-window counter.
const RUN_WRITE_LIMIT = Number(process.env.SCOUT_RUN_WRITE_LIMIT ?? 60);
const RUN_WRITE_WINDOW_MS = 60 * 1000; // 1 minute
const runWrites = new Map<string, { count: number; windowStart: number }>();

/** Returns true if the caller is within the run-history write rate limit. */
export function allowRunWrite(key: string): boolean {
  const now = Date.now();
  const state = runWrites.get(key);
  if (!state || now - state.windowStart >= RUN_WRITE_WINDOW_MS) {
    runWrites.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (state.count >= RUN_WRITE_LIMIT) return false;
  state.count += 1;
  return true;
}

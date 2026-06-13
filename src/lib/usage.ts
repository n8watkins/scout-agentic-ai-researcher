/**
 * In-memory shared demo-pool accounting. A research run is many model calls,
 * so the budget is measured in *runs*, not tokens. Resets on a rolling window.
 * Process-local (fine for a single free-tier instance); resets on redeploy.
 */

const POOL_BUDGET = Number(process.env.SCOUT_DEMO_RUN_BUDGET ?? 60); // runs per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const PER_IP_LIMIT = Number(process.env.SCOUT_PER_IP_RUN_LIMIT ?? 8); // runs/window/IP

interface PoolState {
  used: number;
  windowStart: number;
}

const pool: PoolState = { used: 0, windowStart: Date.now() };
const perIp = new Map<string, { count: number; windowStart: number }>();

function rollPool() {
  const now = Date.now();
  if (now - pool.windowStart >= WINDOW_MS) {
    pool.used = 0;
    pool.windowStart = now;
  }
}

export interface UsageSnapshot {
  pool: {
    used: number;
    budget: number;
    available: number;
    resetAt: number;
  };
}

export function getUsageSnapshot(): UsageSnapshot {
  rollPool();
  return {
    pool: {
      used: pool.used,
      budget: POOL_BUDGET,
      available: Math.max(0, POOL_BUDGET - pool.used),
      resetAt: pool.windowStart + WINDOW_MS,
    },
  };
}

export interface PoolCheck {
  allowed: boolean;
  reason?: 'pool_exhausted' | 'ip_limit';
}

/**
 * Reserve a demo run for the given IP. BYOK runs should NOT call this.
 * Returns whether the run is allowed and increments counters if so.
 */
export function reserveDemoRun(ip: string): PoolCheck {
  rollPool();
  const now = Date.now();

  const ipState = perIp.get(ip);
  if (!ipState || now - ipState.windowStart >= WINDOW_MS) {
    perIp.set(ip, { count: 0, windowStart: now });
  }
  const cur = perIp.get(ip)!;

  if (pool.used >= POOL_BUDGET) {
    return { allowed: false, reason: 'pool_exhausted' };
  }
  if (cur.count >= PER_IP_LIMIT) {
    return { allowed: false, reason: 'ip_limit' };
  }

  pool.used += 1;
  cur.count += 1;
  return { allowed: true };
}

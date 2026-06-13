'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { logger } from '@/lib/logger';

/**
 * Shared demo-pool usage snapshot. GET /api/usage returns
 * { pool: { used, budget, resetAt, available } }. The unit is actual model
 * calls (one research run ≈ 15 calls), capped per rolling 24h window.
 */
export interface UsageInfo {
  pool: {
    used: number;
    budget: number;
    resetAt: string | number | null;
    available: number;
  };
}

let currentUsage: UsageInfo | null = null;
const subscribers = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
function getSnapshot(): UsageInfo | null {
  return currentUsage;
}
function getServerSnapshot(): UsageInfo | null {
  return null;
}

function isValid(data: unknown): data is UsageInfo {
  if (!data || typeof data !== 'object') return false;
  const pool = (data as UsageInfo).pool;
  return !!pool && typeof pool === 'object' && typeof pool.budget === 'number';
}

export function publishUsageInfo(data: unknown): void {
  if (!isValid(data)) return;
  currentUsage = data;
  subscribers.forEach((n) => n());
}

export async function refreshUsage(): Promise<void> {
  try {
    const res = await fetch('/api/usage');
    if (!res.ok) return;
    publishUsageInfo(await res.json());
  } catch (err) {
    logger.debug('GET /api/usage unavailable', { err: String(err) });
  }
}

export function useUsageInfo(): UsageInfo | null {
  const usage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    void refreshUsage();
  }, []);
  return usage;
}

// --- pure helpers --------------------------------------------------------

export function isPoolExhausted(usage: UsageInfo | null): boolean {
  return !!usage?.pool && usage.pool.available <= 0;
}

export function poolPercentUsed(usage: UsageInfo | null): number {
  if (!usage?.pool || usage.pool.budget <= 0) return 0;
  const pct = (usage.pool.used / usage.pool.budget) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function formatPoolReset(resetAt: string | number | null | undefined): string {
  if (resetAt === null || resetAt === undefined || resetAt === '') return '';
  const date = new Date(resetAt);
  if (isNaN(date.getTime())) return '';
  const deltaMs = date.getTime() - Date.now();
  if (deltaMs <= 0) return 'soon';
  const minutes = Math.ceil(deltaMs / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours}h ${minutes % 60}m`;
}

'use client';

import React from 'react';
import {
  UsageInfo,
  useUsageInfo,
  poolPercentUsed,
  formatPoolReset,
} from '@/hooks/useUsageInfo';

interface PoolMeterBarProps {
  usage: UsageInfo | null;
  variant?: 'light' | 'dark';
}

/**
 * Shared demo-pool capacity meter, fed by GET /api/usage. A run is the unit
 * (one run = many model calls), so the budget is in runs, not tokens.
 */
export function PoolMeterBar({ usage, variant = 'light' }: PoolMeterBarProps) {
  const light = variant === 'light';
  const labelClass = light ? 'text-gray-700 dark:text-gray-200' : 'text-violet-200';
  const subClass = light ? 'text-gray-500 dark:text-gray-400' : 'text-violet-300/80';
  const trackClass = light ? 'bg-gray-200 dark:bg-gray-700' : 'bg-violet-950/60';

  if (!usage?.pool || usage.pool.budget <= 0) {
    return (
      <div data-testid="pool-meter" data-state="placeholder">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-semibold ${labelClass}`}>Shared demo pool</span>
          <span className={subClass}>checking&hellip;</span>
        </div>
        <div className={`w-full ${trackClass} rounded-full h-1.5 overflow-hidden`}>
          <div className="h-full w-1/3 bg-violet-400/60 animate-pulse rounded-full" />
        </div>
        <p className={`text-xs mt-1 ${subClass}`}>
          You can research right away &mdash; live capacity will appear here.
        </p>
      </div>
    );
  }

  const pctUsed = poolPercentUsed(usage);
  const pctLeft = 100 - pctUsed;
  const exhausted = usage.pool.available <= 0;
  const barColor =
    exhausted || pctUsed >= 90 ? 'bg-red-400' : pctUsed >= 70 ? 'bg-yellow-400' : 'bg-green-400';
  const reset = formatPoolReset(usage.pool.resetAt);

  return (
    <div data-testid="pool-meter" data-state={exhausted ? 'exhausted' : 'ok'}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-semibold ${labelClass}`}>Shared demo pool</span>
        <span className={`font-mono ${labelClass}`}>{pctLeft}% left</span>
      </div>
      <div className={`w-full ${trackClass} rounded-full h-1.5 overflow-hidden`}>
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.max(pctUsed, 2)}%` }}
        />
      </div>
      <p className={`text-xs mt-1 ${subClass}`}>
        {exhausted
          ? `Demo capacity used up${reset ? ` — resets ${reset}` : ''}. Add your own free key to keep researching.`
          : reset
            ? `${usage.pool.available} runs left · resets ${reset}`
            : 'Everyone shares this free demo budget'}
      </p>
    </div>
  );
}

interface SidebarUsageMeterProps {
  hasOwnKey: boolean;
}

/** Persistent sidebar usage indicator. */
export default function SidebarUsageMeter({ hasOwnKey }: SidebarUsageMeterProps) {
  const usage = useUsageInfo();

  return (
    <div
      className="px-3 py-2 bg-violet-900/30 rounded-lg border border-violet-700/40"
      data-testid="sidebar-usage-meter"
    >
      {hasOwnKey ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-violet-200">Your API key</span>
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              active
            </span>
          </div>
          <p className="text-xs text-violet-300/80">Unlimited research on your own key</p>
        </div>
      ) : (
        <PoolMeterBar usage={usage} variant="dark" />
      )}
    </div>
  );
}

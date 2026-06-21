'use client';

import { useMemo, useState } from 'react';
import {
  BeakerIcon,
  ChevronDownIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import type { TraceEvent } from '@/lib/devtrace';

/**
 * The "Under the hood" X-ray panel. Purely additive — it renders the developer
 * telemetry (`TraceEvent[]`) the agent loop emits alongside its visible steps.
 *
 * Shows: a call waterfall (time-axis bars per model/tool call), per-call tokens
 * + estimated $, cumulative totals (tokens, cost, steps vs. budget), tool I/O
 * (raw args + raw results pre-summarization), and the raw prompt/response for
 * each model call inside accordions that default collapsed.
 */
interface DevPanelProps {
  events: TraceEvent[];
  /** The run's step budget — visualizes "a while-loop with a budget". */
  maxSteps?: number;
  /** Whether a run is currently in flight (affects empty-state copy). */
  running?: boolean;
}

const DEFAULT_MAX_STEPS = 8;

/** Phase/kind → bar color. Model phases get violet/fuchsia; tools get a teal. */
const BAR_COLOR: Record<string, string> = {
  plan: 'bg-fuchsia-500',
  'react-step': 'bg-violet-500',
  summarize: 'bg-violet-400',
  synthesize: 'bg-fuchsia-600',
  tool: 'bg-teal-500',
};

export default function DevPanel({ events, maxSteps = DEFAULT_MAX_STEPS, running }: DevPanelProps) {
  const modelCalls = useMemo(
    () => events.filter((e): e is Extract<TraceEvent, { kind: 'model_call' }> => e.kind === 'model_call'),
    [events]
  );
  const toolExecs = useMemo(
    () => events.filter((e): e is Extract<TraceEvent, { kind: 'tool_exec' }> => e.kind === 'tool_exec'),
    [events]
  );

  // Cumulative totals across the run.
  const totals = useMemo(() => {
    let tokensIn = 0;
    let tokensOut = 0;
    let costUsd = 0;
    for (const c of modelCalls) {
      tokensIn += c.tokensIn;
      tokensOut += c.tokensOut;
      costUsd += c.costUsd;
    }
    return { tokensIn, tokensOut, costUsd, modelCalls: modelCalls.length };
  }, [modelCalls]);

  // ReAct steps = react-step model calls; the budget is maxSteps iterations.
  const reactSteps = modelCalls.filter((c) => c.phase === 'react-step').length;

  // Waterfall timeline bounds — span across every timed event.
  const timed = useMemo(
    () =>
      events
        .filter(
          (e): e is Extract<TraceEvent, { kind: 'model_call' | 'tool_exec' }> =>
            e.kind === 'model_call' || e.kind === 'tool_exec'
        )
        .sort((a, b) => a.startedAt - b.startedAt),
    [events]
  );
  const t0 = timed.length ? timed[0].startedAt : 0;
  const tEnd = timed.length ? Math.max(...timed.map((e) => e.endedAt)) : 0;
  const span = Math.max(1, tEnd - t0);

  const hasData = events.length > 0;

  return (
    <section
      className="rounded-2xl border border-violet-300/70 dark:border-violet-800/60 bg-white/70 dark:bg-[#100a1c]/70 backdrop-blur p-5 font-mono text-[12px] text-violet-950 dark:text-violet-100"
      aria-label="Under the hood developer panel"
    >
      <header className="flex items-center gap-2 mb-4 pb-3 border-b border-violet-200 dark:border-violet-900/50">
        <BeakerIcon className="w-5 h-5 text-fuchsia-500" />
        <h2 className="text-sm font-bold tracking-tight text-violet-900 dark:text-white font-sans">
          Under the hood
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-violet-400 dark:text-violet-500 font-sans">
          live telemetry
        </span>
      </header>

      {!hasData ? (
        <EmptyState running={running} />
      ) : (
        <div className="space-y-5">
          <Totals totals={totals} reactSteps={reactSteps} maxSteps={maxSteps} />
          <Waterfall timed={timed} t0={t0} span={span} />
          <CallList modelCalls={modelCalls} t0={t0} />
          <ToolList toolExecs={toolExecs} />
        </div>
      )}
    </section>
  );
}

function EmptyState({ running }: { running?: boolean }) {
  return (
    <p className="text-violet-500 dark:text-violet-400/80 font-sans text-sm py-6 text-center">
      {running
        ? 'Capturing model calls, tokens, latency and cost…'
        : 'Run a question to X-ray the agent — every model call, token count, latency, estimated cost, and raw tool result will show up here. An agent is a while-loop with a budget; this panel makes the budget visible.'}
    </p>
  );
}

function Totals({
  totals,
  reactSteps,
  maxSteps,
}: {
  totals: { tokensIn: number; tokensOut: number; costUsd: number; modelCalls: number };
  reactSteps: number;
  maxSteps: number;
}) {
  const pct = Math.min(100, Math.round((reactSteps / Math.max(1, maxSteps)) * 100));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Stat label="model calls" value={String(totals.modelCalls)} />
      <Stat label="tokens (in / out)" value={`${fmt(totals.tokensIn)} / ${fmt(totals.tokensOut)}`} />
      <Stat label="est. cost" value={formatUsd(totals.costUsd)} accent />
      <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-violet-400 dark:text-violet-500">
          steps vs budget
        </p>
        <p className="text-sm font-bold text-violet-900 dark:text-white">
          {reactSteps} / {maxSteps}
        </p>
        <div className="mt-1 h-1.5 rounded-full bg-violet-200 dark:bg-violet-800/60 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-violet-400 dark:text-violet-500">{label}</p>
      <p
        className={`text-sm font-bold ${
          accent ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-violet-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Waterfall({
  timed,
  t0,
  span,
}: {
  timed: Array<Extract<TraceEvent, { kind: 'model_call' | 'tool_exec' }>>;
  t0: number;
  span: number;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-violet-400 dark:text-violet-500 mb-2 font-sans">
        call waterfall · {Math.round(span)}ms total
      </p>
      <div className="space-y-1.5">
        {timed.map((e) => {
          const isModel = e.kind === 'model_call';
          const phaseKey = isModel ? e.phase : 'tool';
          const color = BAR_COLOR[phaseKey] ?? 'bg-violet-500';
          const left = ((e.startedAt - t0) / span) * 100;
          const width = Math.max(1.5, ((e.endedAt - e.startedAt) / span) * 100);
          const dur = e.endedAt - e.startedAt;
          const label = isModel ? e.phase : e.name;
          return (
            <div key={e.id} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-violet-600 dark:text-violet-300/90" title={label}>
                {label}
              </span>
              <div className="relative flex-1 h-4 rounded bg-violet-100/70 dark:bg-violet-900/30">
                <div
                  className={`absolute top-0 h-4 rounded ${color}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${label} · ${dur}ms`}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-violet-400 dark:text-violet-500">{dur}ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CallList({
  modelCalls,
  t0,
}: {
  modelCalls: Array<Extract<TraceEvent, { kind: 'model_call' }>>;
  t0: number;
}) {
  if (modelCalls.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-violet-400 dark:text-violet-500 mb-2 font-sans inline-flex items-center gap-1">
        <CpuChipIcon className="w-3.5 h-3.5" /> model calls
      </p>
      <ul className="space-y-2">
        {modelCalls.map((c) => (
          <ModelCallRow key={c.id} call={c} t0={t0} />
        ))}
      </ul>
    </div>
  );
}

function ModelCallRow({
  call,
  t0,
}: {
  call: Extract<TraceEvent, { kind: 'model_call' }>;
  t0: number;
}) {
  const dur = call.endedAt - call.startedAt;
  const at = call.startedAt - t0;
  return (
    <li className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/15 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="px-1.5 py-0.5 rounded bg-violet-200 dark:bg-violet-800/60 text-violet-800 dark:text-violet-200 font-semibold">
          {call.phase}
        </span>
        <span className="text-violet-500 dark:text-violet-400">{call.model}</span>
        <span className="text-violet-400 dark:text-violet-500">+{at}ms</span>
        <span className="text-violet-400 dark:text-violet-500">{dur}ms</span>
        <span className="ml-auto text-violet-700 dark:text-violet-200">
          {fmt(call.tokensIn)} in / {fmt(call.tokensOut)} out
        </span>
        <span className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold">{formatUsd(call.costUsd)}</span>
      </div>
      {call.toolCall && (
        <p className="mt-1 text-teal-700 dark:text-teal-300">
          → {call.toolCall.name}({truncate(JSON.stringify(call.toolCall.args), 120)})
        </p>
      )}
      <Accordion label="prompt sent">{call.prompt || '(empty)'}</Accordion>
      <Accordion label="raw response">{call.rawResponse || '(no text — function call only)'}</Accordion>
    </li>
  );
}

function ToolList({
  toolExecs,
}: {
  toolExecs: Array<Extract<TraceEvent, { kind: 'tool_exec' }>>;
}) {
  if (toolExecs.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-violet-400 dark:text-violet-500 mb-2 font-sans inline-flex items-center gap-1">
        <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> tool calls (raw, pre-summarization)
      </p>
      <ul className="space-y-2">
        {toolExecs.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-900/15 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="px-1.5 py-0.5 rounded bg-teal-200 dark:bg-teal-800/60 text-teal-800 dark:text-teal-200 font-semibold">
                {t.name}
              </span>
              <span className={t.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                {t.ok ? 'ok' : 'failed'}
              </span>
              <span className="ml-auto text-teal-400 dark:text-teal-500">{t.endedAt - t.startedAt}ms</span>
            </div>
            <p className="mt-1 text-teal-700 dark:text-teal-300 break-all">
              args: {truncate(JSON.stringify(t.args), 200)}
            </p>
            <Accordion label="raw result">{stringifyResult(t.rawResult)}</Accordion>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Collapsible accordion for raw I/O — defaults collapsed (decision §9). */
function Accordion({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200"
      >
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'hide' : 'show'} {label}
      </button>
      {open && (
        <pre className="mt-1 whitespace-pre-wrap break-all max-h-72 overflow-y-auto rounded bg-violet-100/60 dark:bg-black/40 border border-violet-200 dark:border-violet-900/50 p-2 text-[11px] text-violet-800 dark:text-violet-200">
          {children}
        </pre>
      )}
    </div>
  );
}

// --- formatting helpers --------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/** $ readout — shows enough precision for sub-cent demo runs. */
export function formatUsd(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function stringifyResult(result: unknown): string {
  if (result == null) return '(none)';
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

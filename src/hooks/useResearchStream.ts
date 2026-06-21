'use client';

import { useCallback, useRef, useState } from 'react';
import type { AgentStep, Citation } from '@/lib/agent/types';
import type { TraceEvent } from '@/lib/devtrace';
import { refreshUsage } from './useUsageInfo';
import { usePersistence } from '@/lib/persistence';

export type RunStatus = 'idle' | 'running' | 'done' | 'error' | 'aborted';

export interface ResearchState {
  status: RunStatus;
  question: string;
  steps: AgentStep[];
  /** Developer-telemetry events for the "Under the hood" panel (additive). */
  telemetry: TraceEvent[];
  report: string;
  citations: Citation[];
  stoppedEarly: boolean;
  statusLabel: string;
  error: string | null;
  runId: string | null;
}

const INITIAL: ResearchState = {
  status: 'idle',
  question: '',
  steps: [],
  telemetry: [],
  report: '',
  citations: [],
  stoppedEarly: false,
  statusLabel: '',
  error: null,
  runId: null,
};

/**
 * Consume the /api/research SSE stream and assemble the step timeline in
 * state. Status events drive the "Planning… → Searching… → Reading… → Writing…"
 * label; the answer event populates the report; done triggers an auto-save.
 */
export function useResearchStream() {
  const [state, setState] = useState<ResearchState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  // Persistence backend (server when signed in, else on-device). Held in a ref
  // so the run() callback always saves to the current backend without re-binding.
  const store = usePersistence();
  const storeRef = useRef(store);
  storeRef.current = store;

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  const run = useCallback(async (question: string, apiKey: string | null, model?: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setState({ ...INITIAL, status: 'running', question, statusLabel: 'Planning', runId });

    const collected: AgentStep[] = [];
    const telemetry: TraceEvent[] = [];
    let report = '';
    let citations: Citation[] = [];
    let stoppedEarly = false;

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
        },
        body: JSON.stringify({ question, ...(model ? { model } : {}) }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          /* ignore */
        }
        setState((s) => ({ ...s, status: 'error', error: message, statusLabel: '' }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue; // comment / keep-alive
          const json = line.slice(5).trim();
          if (!json) continue;
          let step: AgentStep;
          try {
            step = JSON.parse(json) as AgentStep;
          } catch {
            continue;
          }
          handleStep(step);
        }
      }

      function handleStep(step: AgentStep) {
        if (step.type === 'telemetry') {
          // Additive dev-panel telemetry — never touches the visible timeline.
          if (step.trace) {
            telemetry.push(step.trace);
            setState((s) => ({ ...s, telemetry: [...telemetry] }));
          }
          return;
        }
        if (step.type === 'status') {
          if (step.label) setState((s) => ({ ...s, statusLabel: step.label! }));
          return;
        }
        if (step.type === 'answer_delta') {
          // Streamed report chunk — append so the report types out live.
          report += step.content ?? '';
          setState((s) => ({ ...s, report }));
          return;
        }
        if (step.type === 'answer') {
          // Final canonical report (matches the accumulated deltas).
          report = step.content ?? report;
          citations = step.citations ?? citations;
          stoppedEarly = !!step.stoppedEarly;
          setState((s) => ({ ...s, report, citations, stoppedEarly }));
          return;
        }
        if (step.type === 'done') {
          stoppedEarly = !!step.stoppedEarly;
          if (step.citations) citations = step.citations;
          return;
        }
        if (step.type === 'error') {
          setState((s) => ({ ...s, error: step.content ?? 'Run failed' }));
          return;
        }
        collected.push(step);
        if (step.citations) citations = step.citations;
        setState((s) => ({ ...s, steps: [...collected], citations }));
      }

      setState((s) => ({ ...s, status: 'done', statusLabel: '' }));
      void refreshUsage();

      // Persist the completed run (server if signed in, else on-device).
      if (report) {
        void storeRef.current.saveRun({
          id: runId,
          question,
          report,
          citations,
          steps: collected,
          stoppedEarly,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      if (ac.signal.aborted) {
        setState((s) => ({ ...s, status: 'aborted', statusLabel: '' }));
      } else {
        setState((s) => ({
          ...s,
          status: 'error',
          error: (err as Error).message,
          statusLabel: '',
        }));
      }
    }
  }, []);

  const loadSaved = useCallback(
    (saved: {
      id: string;
      question: string;
      report: string;
      citations: Citation[];
      steps: AgentStep[];
      stoppedEarly: boolean;
    }) => {
      abortRef.current?.abort();
      setState({
        status: 'done',
        question: saved.question,
        steps: saved.steps,
        // Telemetry is live-only (not persisted); a loaded run shows none.
        telemetry: [],
        report: saved.report,
        citations: saved.citations,
        stoppedEarly: saved.stoppedEarly,
        statusLabel: '',
        error: null,
        runId: saved.id,
      });
    },
    []
  );

  return { state, run, stop, reset, loadSaved };
}

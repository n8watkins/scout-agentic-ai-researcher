/**
 * Core agent types shared by the loop, the SSE route, and the client hook.
 */

export type StepType =
  | 'plan'
  | 'thought'
  | 'tool_call'
  | 'observation'
  | 'answer'
  | 'status'
  | 'error'
  | 'done';

export type ToolName = 'web_search' | 'fetch_url' | 'finish';

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

/** A registered, citable source. The `index` is the [n] used in the report. */
export interface Citation {
  index: number;
  title: string;
  url: string;
  /** Short snippet (from search) or summary (from fetch). */
  snippet: string;
  /** Full extracted text — kept server-side / in SourcesPanel only. */
  fullText?: string;
}

/** One streamed event in the agent timeline. */
export interface AgentStep {
  id: string;
  type: StepType;
  /** Human-readable label, e.g. "Searching: best EV 2025". */
  label?: string;
  /** Body text (thought, observation summary, or final report markdown). */
  content?: string;
  /** For tool_call steps. */
  toolCall?: ToolCall;
  /** Step index in the loop (1-based), for display. */
  iteration?: number;
  /** Sources registered so far (sent on observation / answer). */
  citations?: Citation[];
  /** True when the run hit the step budget before finishing. */
  stoppedEarly?: boolean;
  createdAt: number;
}

export interface RunOptions {
  model: string;
  apiKey: string;
  /** Whether the key is the visitor's own (BYOK) or the shared demo key. */
  byok: boolean;
  maxSteps?: number;
  signal?: AbortSignal;
}

/** Persisted run record (SQLite). */
export interface SavedRun {
  id: string;
  question: string;
  report: string;
  citations: Citation[];
  steps: AgentStep[];
  stoppedEarly: boolean;
  createdAt: number;
}

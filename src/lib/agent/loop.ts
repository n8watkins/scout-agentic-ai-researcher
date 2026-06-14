import { type Content, type GenerateContentResponse } from '@google/genai';
import { makeClient } from '../gemini';
import { webSearch } from '../search';
import { fetchUrl } from './fetchUrl';
import { TOOL_DECLARATIONS } from './tools';
import {
  SYSTEM_PROMPT,
  planPrompt,
  summarizeObservationPrompt,
  synthesisPrompt,
} from './prompts';
import type { AgentStep, Citation, RunOptions, StepType, ToolCall } from './types';
import { logger } from '../logger';
import { recordDemoModelCall } from '../usage';

/**
 * After this many consecutive ACT iterations that add no new source (including
 * duplicate short-circuits), break early into synthesis rather than burning the
 * rest of the step budget spinning on the same sources.
 */
const MAX_NO_PROGRESS = 2;

let stepSeq = 0;
function makeStep(type: StepType, partial: Partial<AgentStep> = {}): AgentStep {
  return {
    id: `step-${Date.now()}-${stepSeq++}`,
    type,
    createdAt: Date.now(),
    ...partial,
  };
}

/**
 * The ReAct loop. An agent is a while-loop with a step budget and an explicit
 * stop condition — that's the whole thesis. Each iteration:
 *   THINK + ACT  → model returns text and/or a single function call
 *   OBSERVE      → run the tool, summarize the result into working memory
 *   repeat until the model calls `finish` or we hit maxSteps
 * then SYNTHESIZE a cited report from gathered sources only.
 */
export async function* runAgent(
  question: string,
  opts: RunOptions
): AsyncGenerator<AgentStep> {
  const { apiKey, model, maxSteps = 8, signal, byok } = opts;
  const ai = makeClient(apiKey);

  // Every Gemini call goes through here so demo-key calls are metered against
  // the shared daily cap. BYOK calls bypass the counter entirely.
  type GenParams = Parameters<typeof ai.models.generateContent>[0];
  const generate = (params: GenParams): Promise<GenerateContentResponse> => {
    if (!byok) recordDemoModelCall();
    return ai.models.generateContent(params);
  };

  const citations: Citation[] = [];
  // Working memory: compact transcript of what the agent has done/learned.
  const transcript: string[] = [];
  let stoppedEarly = false;

  // Action memory: dedupe wasted work. A repeated search query or a re-fetch
  // of an already-read URL burns a step (and, for fetch, a model summarize
  // call) for nothing. We short-circuit those before touching the network.
  const issuedQueries = new Set<string>();
  const fetchedUrls = new Set<string>();
  // Consecutive ACT iterations that added no new source. A short-circuit
  // counts as no-progress; a fetch yielding a new source resets it.
  let noProgress = 0;

  const registerSource = (title: string, url: string, snippet: string, fullText?: string): number => {
    const existing = citations.find((c) => c.url === url);
    if (existing) return existing.index;
    const index = citations.length + 1;
    citations.push({ index, title, url, snippet, fullText });
    return index;
  };

  // --- Optional up-front plan -------------------------------------------
  yield makeStep('status', { label: 'Planning' });
  try {
    const planRes = await generate({
      model,
      contents: planPrompt(question),
      config: { abortSignal: signal },
    });
    const planText = textOf(planRes);
    if (planText) {
      transcript.push(`Plan:\n${planText}`);
      yield makeStep('plan', { content: planText, label: 'Plan' });
    }
  } catch (err) {
    if (isAbort(err)) return;
    logger.warn('Planning step failed (continuing without plan)', { err: String(err) });
  }

  // --- THINK → ACT → OBSERVE loop ---------------------------------------
  for (let i = 0; i < maxSteps; i++) {
    if (signal?.aborted) return;
    const iteration = i + 1;

    let res: GenerateContentResponse;
    try {
      yield makeStep('status', { label: 'Thinking' });
      res = await generate({
        model,
        contents: buildContents(question, transcript),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          abortSignal: signal,
        },
      });
    } catch (err) {
      if (isAbort(err)) return;
      yield makeStep('error', { content: `Model call failed: ${(err as Error).message}` });
      break;
    }

    const call = firstToolCall(res);
    const thought = textOf(res);

    // Gemini returns text OR a function call per turn — stream a thought only
    // on turns where it returned prose instead of acting.
    if (thought && !call) {
      yield makeStep('thought', { content: thought, iteration });
      transcript.push(`Thought: ${thought}`);
    }

    // STOP CONDITION: no tool call, or the explicit finish signal.
    if (!call || call.name === 'finish') {
      break;
    }

    // --- ACT ---
    const citationsBefore = citations.length;
    if (call.name === 'web_search') {
      const query = String(call.args.query ?? '').trim();
      const queryKey = normalizeQuery(query);
      yield makeStep('tool_call', {
        label: `Searching: ${query}`,
        toolCall: call,
        iteration,
      });

      // Duplicate-action short-circuit: don't re-run a query we've issued.
      // Nudge the model instead of spending a step on the same search.
      if (issuedQueries.has(queryKey)) {
        const observation = `You already searched "${query}". Choose a different source or call finish.`;
        transcript.push(`Action: web_search("${query}")\nObservation: ${observation}`);
        yield makeStep('observation', {
          label: `Already searched "${query}"`,
          content: observation,
          citations: snapshot(citations),
          iteration,
        });
      } else {
        issuedQueries.add(queryKey);
        yield makeStep('status', { label: 'Searching' });

        let observation: string;
        try {
          const results = await webSearch(query, signal);
          if (results.length === 0) {
            observation = `No results for "${query}".`;
          } else {
            const lines = results.map((r) => {
              const idx = registerSource(r.title, r.url, r.snippet);
              return `[${idx}] ${r.title} — ${r.url}\n    ${r.snippet}`;
            });
            observation = `Search results for "${query}":\n${lines.join('\n')}`;
          }
        } catch (err) {
          if (isAbort(err)) return;
          observation = `Search failed: ${(err as Error).message}`;
        }
        transcript.push(`Action: web_search("${query}")\nObservation: ${observation}`);
        yield makeStep('observation', {
          label: `Results for "${query}"`,
          content: observation,
          citations: snapshot(citations),
          iteration,
        });
      }
    } else if (call.name === 'fetch_url') {
      const url = String(call.args.url ?? '').trim();
      const urlKey = normalizeUrl(url);
      const host = safeHost(url);
      yield makeStep('tool_call', {
        label: `Reading: ${host}`,
        toolCall: call,
        iteration,
      });

      // Duplicate-action short-circuit: don't re-read a URL we've fetched.
      // This also saves the extra model "summarize" call a fetch would cost.
      if (fetchedUrls.has(urlKey)) {
        const existing = citations.find((c) => normalizeUrl(c.url) === urlKey);
        const ref = existing ? ` ([${existing.index}])` : '';
        const observation = `You already read ${url}${ref}. Choose a different source or call finish.`;
        transcript.push(`Action: fetch_url("${url}")\nObservation: ${observation}`);
        yield makeStep('observation', {
          label: `Already read ${host}`,
          content: observation,
          citations: snapshot(citations),
          iteration,
        });
      } else {
        fetchedUrls.add(urlKey);
        yield makeStep('status', { label: 'Reading' });

        let observation: string;
        try {
          const result = await fetchUrl(url, signal);
          if (!result.ok) {
            observation = `Could not read ${url}: ${result.error}`;
          } else {
            // Summarize to control the context budget — full text stays in the
            // citation record (SourcesPanel), not the transcript.
            const summary = await summarize(generate, model, question, result.text, signal);
            const idx = registerSource(result.title, result.url, summary, result.text);
            observation = `Read [${idx}] ${result.title} (${result.url}):\n${summary}`;
          }
        } catch (err) {
          if (isAbort(err)) return;
          observation = `Could not read ${url}: ${(err as Error).message}`;
        }
        transcript.push(`Action: fetch_url("${url}")\nObservation: ${observation}`);
        yield makeStep('observation', {
          label: `Read ${host}`,
          content: observation,
          citations: snapshot(citations),
          iteration,
        });
      }
    }

    // No-progress detection: an ACT iteration that added no new source (a
    // failed/empty search, or a duplicate short-circuit) counts against the
    // budget; a fetch that yields a new source resets the counter.
    if (citations.length > citationsBefore) {
      noProgress = 0;
    } else {
      noProgress++;
    }

    // Spinning on the same sources — bail into synthesis rather than burn budget.
    if (noProgress >= MAX_NO_PROGRESS) {
      stoppedEarly = true;
      break;
    }

    // Did we just consume the last allowed step without finishing?
    if (i === maxSteps - 1) {
      stoppedEarly = true;
    }
  }

  // --- SYNTHESIZE -------------------------------------------------------
  yield makeStep('status', { label: 'Writing' });
  let report: string;
  try {
    report = await synthesize(generate, model, question, citations, stoppedEarly, signal);
  } catch (err) {
    if (isAbort(err)) return;
    report = `I ran into an error writing the report: ${(err as Error).message}`;
  }

  yield makeStep('answer', {
    content: report,
    citations: snapshot(citations),
    stoppedEarly,
  });
  yield makeStep('done', { stoppedEarly, citations: snapshot(citations) });
}

// --- helpers -------------------------------------------------------------

function buildContents(question: string, transcript: string[]): Content[] {
  const memory =
    transcript.length > 0
      ? `\n\nWhat you've done and learned so far:\n${transcript.join('\n\n')}`
      : '';
  return [
    {
      role: 'user',
      parts: [{ text: `Research question: ${question}${memory}\n\nDecide your next single action.` }],
    },
  ];
}

function textOf(res: GenerateContentResponse): string {
  return (res.text ?? '').trim();
}

function firstToolCall(res: GenerateContentResponse): ToolCall | null {
  const calls = res.functionCalls;
  if (calls && calls.length > 0) {
    const c = calls[0];
    if (c.name === 'web_search' || c.name === 'fetch_url' || c.name === 'finish') {
      return { name: c.name, args: (c.args ?? {}) as Record<string, unknown> };
    }
  }
  return null;
}

type MeteredGenerate = (
  params: Parameters<ReturnType<typeof makeClient>['models']['generateContent']>[0]
) => Promise<GenerateContentResponse>;

async function summarize(
  generate: MeteredGenerate,
  model: string,
  question: string,
  rawText: string,
  signal?: AbortSignal
): Promise<string> {
  if (!rawText.trim()) return 'Not relevant.';
  try {
    const res = await generate({
      model,
      contents: summarizeObservationPrompt(question, rawText.slice(0, 12_000)),
      config: { abortSignal: signal },
    });
    const out = textOf(res);
    return out || rawText.slice(0, 800);
  } catch (err) {
    if (isAbort(err)) throw err;
    // Fall back to a hard truncation if summarization fails.
    return rawText.slice(0, 800);
  }
}

async function synthesize(
  generate: MeteredGenerate,
  model: string,
  question: string,
  citations: Citation[],
  stoppedEarly: boolean,
  signal?: AbortSignal
): Promise<string> {
  if (citations.length === 0) {
    return `I couldn't find any sources to ground an answer to **"${question}"**. The web searches returned nothing usable, so rather than guess, I'm stopping here. Try rephrasing the question or adding a search API key.`;
  }
  const sourcesBlock = citations
    .map((c) => `[${c.index}] ${c.title} (${c.url})\n${c.snippet}`)
    .join('\n\n');
  const res = await generate({
    model,
    contents: synthesisPrompt(question, sourcesBlock, stoppedEarly),
    config: { abortSignal: signal },
  });
  return textOf(res) || 'No report could be generated.';
}

function snapshot(citations: Citation[]): Citation[] {
  // Strip fullText from streamed copies to keep SSE frames small; the
  // SourcesPanel hydrates fullText from the final saved run if needed.
  return citations.map(({ index, title, url, snippet }) => ({ index, title, url, snippet }));
}

/** Normalize a search query for dedupe: trim + lowercase + collapse whitespace. */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalize a URL for dedupe: lowercased host, trailing slash and fragment
 * stripped. Falls back to a trimmed/lowercased string if it can't be parsed.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    let out = u.toString();
    if (out.endsWith('/')) out = out.slice(0, -1);
    return out;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || /abort/i.test(err.message));
}

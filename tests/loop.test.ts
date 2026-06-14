import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

/**
 * Tests for the ReAct loop's wasted-work guards:
 *  - duplicate web_search query short-circuit
 *  - duplicate fetch_url URL short-circuit
 *  - no-progress early stop
 *
 * We mock the Gemini client (via makeClient), the search adapter, the URL
 * fetcher, and the usage meter, then script the model's turn-by-turn output.
 */

// --- mocks ---------------------------------------------------------------

const webSearch = vi.fn();
const fetchUrl = vi.fn();
const recordDemoModelCall = vi.fn();

vi.mock('@/lib/search', () => ({ webSearch: (...a: unknown[]) => webSearch(...a) }));
vi.mock('@/lib/agent/fetchUrl', () => ({ fetchUrl: (...a: unknown[]) => fetchUrl(...a) }));
vi.mock('@/lib/usage', () => ({ recordDemoModelCall: () => recordDemoModelCall() }));

/**
 * Scripted model. Each call to generateContent shifts the next response off a
 * queue. A response is described by either prose text or a single tool call.
 */
type Scripted =
  | { text: string }
  | { call: { name: string; args?: Record<string, unknown> } };

const generateContent: Mock = vi.fn();

vi.mock('@/lib/gemini', () => ({
  makeClient: () => ({ models: { generateContent } }),
}));

function script(responses: Scripted[]): void {
  const queue = [...responses];
  generateContent.mockImplementation(async () => {
    const next = queue.shift() ?? { text: 'done' };
    if ('call' in next) {
      return {
        text: '',
        functionCalls: [{ name: next.call.name, args: next.call.args ?? {} }],
      };
    }
    return { text: next.text, functionCalls: [] };
  });
}

// Import after mocks are registered.
import { runAgent } from '@/lib/agent/loop';
import type { AgentStep } from '@/lib/agent/types';

async function collect(question: string, maxSteps = 8): Promise<AgentStep[]> {
  const steps: AgentStep[] = [];
  for await (const s of runAgent(question, {
    model: 'test-model',
    apiKey: 'k',
    byok: true,
    maxSteps,
  })) {
    steps.push(s);
  }
  return steps;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: plan returns prose, so the loop continues to the ACT phase.
  generateContent.mockResolvedValue({ text: 'plan', functionCalls: [] });
});

describe('duplicate web_search short-circuit', () => {
  it('does not call webSearch twice for the same (normalized) query', async () => {
    webSearch.mockResolvedValue([
      { title: 'A', url: 'https://a.com', snippet: 's' },
    ]);
    script([
      { text: 'plan' }, // up-front plan
      { call: { name: 'web_search', args: { query: 'best EV 2025' } } },
      { call: { name: 'web_search', args: { query: '  BEST   ev 2025 ' } } }, // dup
      { call: { name: 'finish' } },
      { text: 'final report [1]' }, // synthesis
    ]);

    const steps = await collect('q');

    expect(webSearch).toHaveBeenCalledTimes(1);
    const obs = steps.filter((s) => s.type === 'observation');
    expect(obs.some((s) => /already searched/i.test(s.content ?? ''))).toBe(true);
  });
});

describe('duplicate fetch_url short-circuit', () => {
  it('does not call fetchUrl twice for the same (normalized) URL and skips the summarize call', async () => {
    webSearch.mockResolvedValue([
      { title: 'A', url: 'https://a.com', snippet: 's' },
    ]);
    fetchUrl.mockResolvedValue({
      ok: true,
      url: 'https://a.com/article',
      title: 'Article',
      text: 'body text',
    });
    script([
      { text: 'plan' },
      { call: { name: 'web_search', args: { query: 'q1' } } },
      { call: { name: 'fetch_url', args: { url: 'https://a.com/article' } } },
      { text: 'thinking summary of the fetched page' }, // summarize call
      { call: { name: 'fetch_url', args: { url: 'https://A.com/article/#frag' } } }, // dup
      { call: { name: 'finish' } },
      { text: 'final report [1]' }, // synthesis
    ]);

    const steps = await collect('q');

    expect(fetchUrl).toHaveBeenCalledTimes(1);
    const obs = steps.filter((s) => s.type === 'observation');
    expect(obs.some((s) => /already read/i.test(s.content ?? ''))).toBe(true);
  });
});

describe('no-progress early stop', () => {
  it('breaks into synthesis with stoppedEarly after MAX_NO_PROGRESS unproductive iterations', async () => {
    // Same query each time → both ACT iterations are duplicate short-circuits
    // (no new source), tripping the no-progress threshold of 2.
    webSearch.mockResolvedValue([
      { title: 'A', url: 'https://a.com', snippet: 's' },
    ]);
    script([
      { text: 'plan' },
      { call: { name: 'web_search', args: { query: 'same query' } } }, // real, adds source, resets
      { call: { name: 'web_search', args: { query: 'same query' } } }, // dup → noProgress=1
      { call: { name: 'web_search', args: { query: 'same query' } } }, // dup → noProgress=2 → break
      { call: { name: 'web_search', args: { query: 'should not run' } } },
      { call: { name: 'finish' } },
      { text: 'partial report [1]' }, // synthesis
    ]);

    const steps = await collect('q', 8);

    // Only the first (unique) query hit the network.
    expect(webSearch).toHaveBeenCalledTimes(1);
    const answer = steps.find((s) => s.type === 'answer');
    expect(answer?.stoppedEarly).toBe(true);
    const done = steps.find((s) => s.type === 'done');
    expect(done?.stoppedEarly).toBe(true);
  });
});

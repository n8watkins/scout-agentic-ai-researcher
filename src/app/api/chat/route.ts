import { NextRequest } from 'next/server';
import { Type, type Content, type FunctionDeclaration } from '@google/genai';
import { makeClient, resolveApiKey, pickModel } from '@/lib/gemini';
import { webSearch } from '@/lib/search';
import { recordDemoModelCall, isDemoCallBudgetExhausted } from '@/lib/usage';
import { CHAT_SYSTEM_PROMPT, chatContextBlock } from '@/lib/agent/prompts';
import { encodeComment, SSE_HEADERS } from '@/lib/sse';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/chat — "talk to the report". A grounded-first follow-up agent:
 * it answers from the already-produced report + sources, and only runs ONE
 * web search when they don't cover the question. Streams the answer as SSE.
 *
 * Stateless: the client sends the report + sources + prior chat turns, so this
 * works for both a live run and a loaded saved run, with no DB dependency. The
 * chat itself is not persisted (decision: avoid storing anonymous chats).
 */

const WEB_SEARCH_TOOL: FunctionDeclaration = {
  name: 'web_search',
  description:
    'Search the web ONLY when the research report and its sources do not contain the answer. Returns up to 5 results.',
  parameters: {
    type: Type.OBJECT,
    properties: { query: { type: Type.STRING, description: 'A focused search query.' } },
    required: ['query'],
  },
};

interface ChatBody {
  question?: string;
  report?: string;
  sources?: Array<{ index: number; title: string; url: string; snippet?: string }>;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
}

const enc = new TextEncoder();
function frame(obj: unknown): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = (body.question ?? '').trim();
  if (!question) return Response.json({ error: 'A question is required' }, { status: 400 });
  if (question.length > 1000) return Response.json({ error: 'Question too long (max 1000 chars)' }, { status: 400 });

  const report = (body.report ?? '').trim();
  if (!report) return Response.json({ error: 'No report to ask about yet' }, { status: 400 });

  const resolved = resolveApiKey(req.headers.get('x-gemini-key'));
  if (!resolved) {
    return Response.json(
      { error: 'No API key available. Add your own free Gemini key to chat.' },
      { status: 401 }
    );
  }

  // Demo-key chats draw from the shared model-call pool (BYOK is unlimited).
  if (!resolved.byok && isDemoCallBudgetExhausted()) {
    return Response.json(
      { error: 'The shared demo pool is used up for now. Add your own free Gemini key to keep chatting.' },
      { status: 429 }
    );
  }

  const model = pickModel(body.model, resolved.byok);
  const ai = makeClient(resolved.apiKey);

  const sources = body.sources ?? [];
  const sourcesBlock = sources
    .map((s) => `[${s.index}] ${s.title} (${s.url})\n${s.snippet ?? ''}`)
    .join('\n\n');

  const history = (body.history ?? [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-10); // cap context to the last few turns

  const ac = new AbortController();
  req.signal.addEventListener('abort', () => ac.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encodeComment());
        } catch {
          /* closed */
        }
      }, 15000);
      const send = (obj: unknown) => {
        try {
          controller.enqueue(frame(obj));
        } catch {
          /* closed */
        }
      };
      const meter = () => {
        if (!resolved.byok) recordDemoModelCall();
      };

      const contextTurns: Content[] = [
        { role: 'user', parts: [{ text: chatContextBlock(report, sourcesBlock) }] },
        {
          role: 'model',
          parts: [
            {
              text: 'Understood. I will answer from this report and its sources, and only search the web if they do not cover the question.',
            },
          ],
        },
        ...history.map(
          (m): Content => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })
        ),
      ];

      try {
        // --- Decide: answer from the report/sources, or search the web? ---
        send({ type: 'status', label: 'Thinking' });
        meter();
        const decide = await ai.models.generateContent({
          model,
          contents: [...contextTurns, { role: 'user', parts: [{ text: question }] }],
          config: {
            systemInstruction: CHAT_SYSTEM_PROMPT,
            tools: [{ functionDeclarations: [WEB_SEARCH_TOOL] }],
            abortSignal: ac.signal,
          },
        });

        const call = decide.functionCalls?.[0];
        if (!call || call.name !== 'web_search') {
          // Answer was grounded in the report/sources — send the text we have.
          const text = (decide.text ?? '').trim() || "I couldn't find that in the report.";
          send({ type: 'delta', content: text });
          send({ type: 'done', searched: false });
          return;
        }

        // --- One web-search round (the report/sources fell short) ---
        const query = (String(call.args?.query ?? '').trim() || question).slice(0, 300);
        send({ type: 'status', label: `Searching the web: ${query}` });
        let resultsBlock: string;
        try {
          const results = await webSearch(query, ac.signal);
          resultsBlock = results.length
            ? results.map((r, i) => `(${i + 1}) ${r.title} — ${r.url}\n${r.snippet}`).join('\n\n')
            : 'No results found.';
        } catch (err) {
          if (ac.signal.aborted) return;
          logger.warn('Chat web search failed', { err: String(err) });
          // Don't feed the raw error to the model as if it were results.
          resultsBlock = 'No additional web results were available.';
        }
        if (ac.signal.aborted) return;

        // --- Answer with the new results (fresh contents, no tool round-trip:
        //     avoids the Gemini-3 thoughtSignature 400). Streamed. ---
        send({ type: 'status', label: 'Writing' });
        meter();
        const answerStream = await ai.models.generateContentStream({
          model,
          contents: [
            ...contextTurns,
            {
              role: 'user',
              parts: [
                {
                  text: `${question}\n\nThe report and its sources did not fully cover this, so here are fresh web search results for "${query}" — use them to answer, and name any newly used source inline (title + URL):\n\n${resultsBlock}`,
                },
              ],
            },
          ],
          config: { systemInstruction: CHAT_SYSTEM_PROMPT, abortSignal: ac.signal },
        });
        for await (const chunk of answerStream) {
          if (ac.signal.aborted) return;
          const delta = chunk.text ?? '';
          if (delta) send({ type: 'delta', content: delta });
        }
        send({ type: 'done', searched: true });
      } catch (err) {
        if (!ac.signal.aborted) {
          logger.error('Chat failed', { err: String(err) });
          send({ type: 'error', content: `Chat failed: ${(err as Error).message}` });
        }
      } finally {
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      ac.abort();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

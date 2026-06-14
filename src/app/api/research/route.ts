import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent/loop';
import { resolveApiKey, pickModel } from '@/lib/gemini';
import { reserveDemoRun } from '@/lib/usage';
import { encodeComment, encodeStep, SSE_HEADERS } from '@/lib/sse';
import { logger } from '@/lib/logger';
import { clientIp } from '@/lib/request';
import type { AgentStep } from '@/lib/agent/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/research — start a run, stream agent steps as Server-Sent Events.
 * The stream is one-directional (server → UI), which is why SSE is the honest
 * choice here rather than a WebSocket.
 */
export async function POST(req: NextRequest) {
  let body: { question?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = (body.question ?? '').trim();
  if (!question) {
    return Response.json({ error: 'A question is required' }, { status: 400 });
  }
  if (question.length > 500) {
    return Response.json({ error: 'Question too long (max 500 chars)' }, { status: 400 });
  }

  const byokKey = req.headers.get('x-gemini-key');
  const resolved = resolveApiKey(byokKey);
  if (!resolved) {
    return Response.json(
      { error: 'No API key available. Add your own free Gemini key to run.' },
      { status: 401 }
    );
  }

  // Demo-key runs draw from the shared pool and a per-IP cap; BYOK is unlimited.
  if (!resolved.byok) {
    const check = reserveDemoRun(clientIp(req));
    if (!check.allowed) {
      const msg =
        check.reason === 'ip_limit'
          ? "You've hit the per-visitor demo limit. Add your own free Gemini key for unlimited runs."
          : 'The shared demo pool is used up for now. Add your own free Gemini key to keep researching.';
      return Response.json({ error: msg, reason: check.reason }, { status: 429 });
    }
  }

  const ac = new AbortController();
  // If the client disconnects, abort the in-flight model/tool calls.
  req.signal.addEventListener('abort', () => ac.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encodeComment());
        } catch {
          /* stream closed */
        }
      }, 15000);

      const send = (step: AgentStep) => {
        try {
          controller.enqueue(encodeStep(step));
        } catch {
          /* stream closed */
        }
      };

      try {
        for await (const step of runAgent(question, {
          apiKey: resolved.apiKey,
          byok: resolved.byok,
          model: pickModel(body.model, resolved.byok),
          maxSteps: 8,
          signal: ac.signal,
        })) {
          send(step);
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          logger.error('Agent run failed', { err: String(err) });
          send({
            id: `err-${Date.now()}`,
            type: 'error',
            content: `The run failed: ${(err as Error).message}`,
            createdAt: Date.now(),
          });
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

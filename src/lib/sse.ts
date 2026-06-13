import type { AgentStep } from './agent/types';

/**
 * SSE encoding helpers. The research stream is one-directional (server → UI),
 * which is exactly what Server-Sent Events are for — no WebSocket needed.
 */

const encoder = new TextEncoder();

/** Encode one agent step as an SSE `data:` frame. */
export function encodeStep(step: AgentStep): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(step)}\n\n`);
}

/** A keep-alive comment frame (prevents idle proxies from closing the stream). */
export function encodeComment(text = 'keep-alive'): Uint8Array {
  return encoder.encode(`: ${text}\n\n`);
}

export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

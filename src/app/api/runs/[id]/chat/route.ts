import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getRunChat, setRunChat } from '@/lib/db';
import type { ChatMessage } from '@/lib/agent/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ownerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** GET /api/runs/[id]/chat — the signed-in user's saved chat for a run. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerId();
  if (!owner) return Response.json({ messages: [] });
  const { id } = await ctx.params;
  return Response.json({ messages: await getRunChat(id, owner) });
}

/** PUT /api/runs/[id]/chat — replace the saved chat thread for a run. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 200) : [];
  await setRunChat(id, owner, messages);
  return Response.json({ ok: true });
}

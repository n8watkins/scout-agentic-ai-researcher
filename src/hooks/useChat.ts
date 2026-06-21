'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Citation } from '@/lib/agent/types';
import { usePersistence } from '@/lib/persistence';
import type { ChatMessage } from '@/lib/clientStore';

interface UseChatArgs {
  report: string;
  citations: Citation[];
  apiKey: string | null;
  model?: string;
  runId?: string | null;
}

/**
 * "Talk to the report" chat state, shared between the inline thread (below the
 * report) and the docked composer. Loads/persists per run via the active store
 * (on-device or server), and streams answers from /api/chat.
 */
export function useChat({ report, citations, apiKey, model, runId }: UseChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const store = usePersistence();
  const loadedFor = useRef<string | null>(null);

  // Load this run's saved chat (or clear) when the shown run / backend changes.
  useEffect(() => {
    abortRef.current?.abort();
    setInput('');
    setError(null);
    setStatus('');
    setStreaming(false);
    const key = `${store.authed ? 'srv' : 'loc'}:${runId ?? ''}`;
    loadedFor.current = null;
    let active = true;
    if (runId) {
      void store.getChat(runId).then((saved) => {
        if (!active) return;
        setMessages(saved);
        loadedFor.current = key;
      });
    } else {
      setMessages([]);
      loadedFor.current = key;
    }
    return () => {
      active = false;
    };
  }, [runId, store]);

  // Persist after each turn — only once loaded for this run/backend.
  useEffect(() => {
    const key = `${store.authed ? 'srv' : 'loc'}:${runId ?? ''}`;
    if (runId && !streaming && messages.length > 0 && loadedFor.current === key) {
      void store.saveChat(runId, messages);
    }
  }, [streaming, runId, messages, store]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || streaming) return;

    const history = messages;
    setInput('');
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    setStatus('Thinking');

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-gemini-key': apiKey } : {}) },
        body: JSON.stringify({
          question: q,
          report,
          sources: citations.map((c) => ({ index: c.index, title: c.title, url: c.url, snippet: c.snippet })),
          history,
          ...(model ? { model } : {}),
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `Request failed (${res.status})`;
        try {
          const d = await res.json();
          if (d?.error) msg = d.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        setMessages((m) => m.slice(0, -1));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let searched = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const line = buffer.slice(0, sep).split('\n').find((l) => l.startsWith('data:'));
          buffer = buffer.slice(sep + 2);
          if (!line) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          let ev: { type: string; content?: string; label?: string };
          try {
            ev = JSON.parse(json);
          } catch {
            continue;
          }
          if (ev.type === 'status') {
            if (ev.label?.startsWith('Searching')) searched = true;
            setStatus(ev.label ?? '');
          } else if (ev.type === 'delta') {
            setStatus('');
            setMessages((m) => {
              const copy = [...m];
              const lastM = copy[copy.length - 1];
              if (lastM?.role === 'assistant') {
                copy[copy.length - 1] = { ...lastM, content: lastM.content + (ev.content ?? ''), searched };
              }
              return copy;
            });
          } else if (ev.type === 'error') {
            setError(ev.content ?? 'Chat failed');
            setMessages((m) => {
              const lastM = m[m.length - 1];
              return lastM?.role === 'assistant' && !lastM.content ? m.slice(0, -1) : m;
            });
          }
        }
      }
    } catch (err) {
      if (!ac.signal.aborted) setError((err as Error).message);
    } finally {
      setStreaming(false);
      setStatus('');
    }
  }, [input, streaming, messages, apiKey, report, citations, model]);

  return { messages, input, setInput, streaming, status, error, send };
}

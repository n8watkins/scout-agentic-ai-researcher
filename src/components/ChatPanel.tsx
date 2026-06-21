'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import type { Citation } from '@/lib/agent/types';
import { type ChatMessage } from '@/lib/clientStore';
import { usePersistence } from '@/lib/persistence';

interface ChatPanelProps {
  report: string;
  citations: Citation[];
  apiKey: string | null;
  model?: string;
  /** Changes when a new/loaded run is shown — resets the conversation. */
  runId?: string | null;
}

/**
 * "Ask about this report" — a grounded-first follow-up chat. Answers from the
 * report + its sources, only searching the web when they fall short. Streams
 * the reply (typewriter), mirroring the report. Conversation is in-memory only.
 */
export default function ChatPanel({ report, citations, apiKey, model, runId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const store = usePersistence();
  // Keys the in-memory messages to (backend, runId) so the persist effect can't
  // write a stale thread into a different run/backend after a switch.
  const loadedFor = useRef<string | null>(null);

  // Load this run's saved chat (or clear) whenever the shown run / backend
  // changes. `loadedFor` is reset up-front so the persist effect below can't
  // save the previous run's messages into the newly-selected run.
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

  // Persist the thread (server if signed in, else on-device) after each turn —
  // but only once it's been loaded for the current run/backend, so a run switch
  // or auth flip can't clobber another thread with stale in-memory messages.
  useEffect(() => {
    const key = `${store.authed ? 'srv' : 'loc'}:${runId ?? ''}`;
    if (runId && !streaming && messages.length > 0 && loadedFor.current === key) {
      void store.saveChat(runId, messages);
    }
  }, [streaming, runId, messages, store]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, status]);

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
          sources: citations.map((c) => ({
            index: c.index,
            title: c.title,
            url: c.url,
            snippet: c.snippet,
          })),
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
        setMessages((m) => m.slice(0, -1)); // drop the empty assistant placeholder
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
          let ev: { type: string; content?: string; label?: string; searched?: boolean };
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
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + (ev.content ?? ''), searched };
              }
              return copy;
            });
          } else if (ev.type === 'error') {
            setError(ev.content ?? 'Chat failed');
            // Drop an empty assistant placeholder so no blank bubble lingers.
            setMessages((m) => {
              const last = m[m.length - 1];
              return last?.role === 'assistant' && !last.content ? m.slice(0, -1) : m;
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

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-900/50 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-5">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Ask about this report
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Answers come from the report and its sources first &mdash; Scout only searches the web if they
        don&apos;t cover your question.
      </p>

      {messages.length > 0 && (
        <div className="space-y-3 mb-4">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 text-white px-3.5 py-2 text-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-900/40 px-3.5 py-2">
                  {m.searched && (
                    <p className="text-[11px] font-medium text-blue-500 dark:text-blue-400 mb-1 inline-flex items-center gap-1">
                      <GlobeAltIcon className="w-3.5 h-3.5" /> searched the web
                    </p>
                  )}
                  <div className="markdown-content text-sm text-gray-800 dark:text-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    {streaming && i === messages.length - 1 && !m.content && (
                      <span className="text-gray-400">{status || 'Thinking'}&hellip;</span>
                    )}
                    {streaming && i === messages.length - 1 && m.content && (
                      <span className="typing-cursor" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </div>
            )
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask a follow-up about this report…"
          rows={1}
          disabled={streaming}
          className="flex-1 resize-none rounded-xl border border-blue-300 dark:border-slate-800 bg-white/80 dark:bg-gray-900/70 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
        />
        <button
          onClick={() => void send()}
          disabled={streaming || !input.trim()}
          aria-label="Send"
          className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

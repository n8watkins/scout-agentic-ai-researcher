'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import type { ChatMessage } from '@/lib/clientStore';

interface ChatThreadProps {
  messages: ChatMessage[];
  streaming: boolean;
  status: string;
}

/** The follow-up conversation, rendered inline directly below the report. */
export default function ChatThread({ messages, streaming, status }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, status]);

  if (messages.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
      {messages.map((m, i) =>
        m.role === 'user' ? (
          <div key={i} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 text-white px-3.5 py-2 text-sm">
              {m.content}
            </div>
          </div>
        ) : (
          <div key={i} className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 px-3.5 py-2">
              {m.searched && (
                <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mb-1 inline-flex items-center gap-1">
                  <GlobeAltIcon className="w-3.5 h-3.5" /> searched the web
                </p>
              )}
              <div className="markdown-content text-sm text-slate-800 dark:text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                {streaming && i === messages.length - 1 && !m.content && (
                  <span className="text-slate-400">{status || 'Thinking'}&hellip;</span>
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
  );
}

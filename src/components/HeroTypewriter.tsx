'use client';

import { useEffect, useState } from 'react';

/** Punchy, short research topics that cycle in the hero typewriter. */
const TOPICS = [
  'solid-state EV batteries',
  'the 2025 long-context LLM landscape',
  'microplastics and human health',
  'carbon capture that’s actually deployed',
  'why coffee prices spiked',
  'nuclear’s comeback in Europe',
];

/** Types/deletes rotating topics after "Watch an AI research ___". */
export default function HeroTypewriter() {
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setText(TOPICS[0]);
      return;
    }
    const full = TOPICS[i];
    let delay = deleting ? 35 : 70;
    if (!deleting && text === full) delay = 1500; // pause at full word
    if (deleting && text === '') delay = 250; // pause before next
    const t = setTimeout(() => {
      if (!deleting && text === full) {
        setDeleting(true);
        return;
      }
      if (deleting && text === '') {
        setDeleting(false);
        setI((p) => (p + 1) % TOPICS.length);
        return;
      }
      setText(deleting ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, i]);

  return (
    <span className="text-blue-600 dark:text-blue-400">
      {text}
      <span className="typing-cursor" aria-hidden="true" />
    </span>
  );
}

import React from 'react';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  KeyIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

/**
 * The "what is this project" content, shared between the first-run onboarding
 * wizard (step 1) and the About modal in the sidebar. Mirrors gemini-chat-app's
 * structure, reskinned violet/fuchsia for Scout.
 */
const AboutContent: React.FC = () => {
  return (
    <div>
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="text-gray-900 dark:text-white text-3xl font-bold mb-4">Welcome to Scout</h2>
      </div>

      {/* Introduction with portrait + bio + socials */}
      <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 p-5 rounded-xl border border-violet-200 dark:border-violet-800 mb-5">
        <div className="flex flex-col items-center gap-4 mb-4">
          <Image
            src="/images/portrait-medium.jpg"
            alt="Nathan's Portrait"
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover border-2 border-violet-500 shadow-md"
          />
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
              I&apos;m Nathan, and this is a Portfolio project designed to showcase modern web dev
              practices with a real-world application. Scout shows what an AI agent actually is under
              the hood &mdash; it highlights my skills in full-stack development, LLM tool-use, and
              streaming UX. I hope you enjoy it, and if you&apos;d like to explore further:
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <ul className="space-y-2 text-gray-700 dark:text-gray-200 text-sm">
            <li className="flex items-start space-x-2">
              <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
              <span>
                Share feedback or report issues on{' '}
                <a
                  href="https://github.com/n8watkins"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline hover:no-underline font-semibold"
                >
                  GitHub
                </a>
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
              <span>
                Check out my{' '}
                <a
                  href="https://n8sportfolio.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline hover:no-underline font-semibold"
                >
                  Portfolio page
                </a>{' '}
                for more projects
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
              <span>Feel free to connect with me on my socials</span>
            </li>
          </ul>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="https://github.com/n8watkins"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="w-8 h-8 rounded-full bg-violet-600 dark:bg-violet-700 hover:bg-violet-700 dark:hover:bg-violet-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/n8watkins/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-full bg-violet-600 dark:bg-violet-700 hover:bg-violet-700 dark:hover:bg-violet-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://x.com/n8watkins"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="w-8 h-8 rounded-full bg-violet-600 dark:bg-violet-700 hover:bg-violet-700 dark:hover:bg-violet-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://n8sportfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            >
              Portfolio
            </a>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="space-y-4">
        <div>
          <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-3 text-center">
            🌟 Key Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureCard
              tone="violet"
              icon={<MagnifyingGlassIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
              title="Live web research"
              desc="Scout searches and reads real sources, not its training data."
            />
            <FeatureCard
              tone="fuchsia"
              icon={<ArrowPathIcon className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />}
              title="Visible agent loop"
              desc="See every think → search → read → write step stream in, live."
            />
            <FeatureCard
              tone="amber"
              icon={<DocumentTextIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
              title="Cited reports"
              desc="Every claim links to the source it came from — click [1] to jump to it."
            />
            <FeatureCard
              tone="green"
              icon={<KeyIcon className="w-6 h-6 text-green-600 dark:text-green-400" />}
              title="Free to try, BYOK optional"
              desc="Run on the shared demo key, or bring your own free Gemini key for unlimited runs."
            />
            <FeatureCard
              tone="gray"
              icon={<CodeBracketIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
              title="Open source on GitHub"
              desc="Full source available — fork it, read the loop, learn from it."
            />
            <FeatureCard
              tone="teal"
              icon={<ShieldCheckIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />}
              title="Guardrails"
              desc="Step caps, source-grounded answers, and SSRF-safe sanitized fetches."
            />
          </div>
        </div>

        {/* Under the hood */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-white text-base font-bold mb-3 text-center">
            ⚡ Under the hood
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UnderHood
              tone="text-violet-600 dark:text-violet-400"
              title="Performance"
              items={['SSE streaming (not WebSockets)', 'Per-observation summarization', 'SQLite run history']}
            />
            <UnderHood
              tone="text-fuchsia-600 dark:text-fuchsia-400"
              title="Agent design"
              items={['ReAct loop w/ step budget', 'Explicit finish stop condition', 'Function-calling tools']}
            />
            <UnderHood
              tone="text-teal-600 dark:text-teal-400"
              title="Safety"
              items={['Source-grounded synthesis', 'DOMPurify on fetched pages', 'SSRF guard on fetch_url']}
            />
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 p-3 rounded-xl">
          <h3 className="text-gray-900 dark:text-white text-sm font-bold mb-2 text-center">
            🛠️ Tech Stack
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {['TypeScript', 'Next.js 16', 'React 19', 'Tailwind CSS', 'Gemini AI', 'SQLite', 'SSE'].map(
              (t) => (
                <span
                  key={t}
                  className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>

        {/* Footer idiom (net-trailers style) */}
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
          <p className="text-gray-700 dark:text-gray-300 text-sm text-center">
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              Portfolio project showcasing:
            </span>{' '}
            ReAct agent loops · LLM function calling · SSE streaming · source-grounded synthesis
          </p>
        </div>
      </div>
    </div>
  );
};

const TONES: Record<string, string> = {
  violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
  fuchsia: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800',
  amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  green:
    'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800',
  gray:
    'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-700',
  teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
};

const FeatureCard: React.FC<{
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  title: string;
  desc: string;
}> = ({ tone, icon, title, desc }) => (
  <div className={`flex items-start space-x-3 p-3 rounded-lg border ${TONES[tone]}`}>
    <span className="mt-0.5 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-600 dark:text-gray-300">{desc}</p>
    </div>
  </div>
);

const UnderHood: React.FC<{ tone: string; title: string; items: string[] }> = ({
  tone,
  title,
  items,
}) => (
  <div>
    <p className={`text-xs font-bold mb-2 ${tone}`}>{title}</p>
    <ul className="text-xs space-y-1.5 text-gray-700 dark:text-gray-300">
      {items.map((it) => (
        <li key={it} className="flex items-start space-x-1.5">
          <span className={`font-bold mt-0.5 ${tone}`}>✓</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default AboutContent;

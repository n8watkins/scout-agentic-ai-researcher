'use client';

import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import OnboardingWizard from '@/components/OnboardingWizard';
import AboutModal from '@/components/AboutModal';
import RunHistorySidebar from '@/components/RunHistorySidebar';
import ResearchInput from '@/components/ResearchInput';
import ThemeToggle from '@/components/ThemeToggle';
import AgentTrace from '@/components/AgentTrace';
import ReportView from '@/components/ReportView';
import SourcesPanel from '@/components/SourcesPanel';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useApiKey } from '@/hooks/useApiKey';
import { useModel } from '@/hooks/useModel';
import { useResearchStream } from '@/hooks/useResearchStream';
import type { SavedRun } from '@/lib/agent/types';

export default function Home() {
  const { showWizard, completeOnboarding, reopen } = useOnboarding();
  const { apiKey } = useApiKey();
  const { model } = useModel();
  const { state, run, stop, reset, loadSaved } = useResearchStream();

  const [question, setQuestion] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isRunning = state.status === 'running';

  const handleSubmit = async (q: string) => {
    await run(q, apiKey, model);
    setRefreshKey((k) => k + 1);
  };

  const handleNewRun = () => {
    reset();
    setQuestion('');
    setSidebarOpen(false);
  };

  const handleSelectRun = (saved: SavedRun) => {
    loadSaved(saved);
    setQuestion(saved.question);
    setSidebarOpen(false);
  };

  const hasContent =
    state.steps.length > 0 || state.report || state.status !== 'idle';

  return (
    <div className="relative h-screen overflow-hidden flex bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-[#0c0a14] dark:via-[#0c0a14] dark:to-[#140c1f]">
      {/* Ambient glow */}
      <div className="scout-orb scout-orb-1" />
      <div className="scout-orb scout-orb-2" />

      {/* Onboarding (first run) */}
      <OnboardingWizard
        isOpen={showWizard}
        onComplete={completeOnboarding}
        onPickSample={(q) => setQuestion(q)}
      />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* Sidebar — slide-over on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <RunHistorySidebar
          activeRunId={state.runId}
          refreshKey={refreshKey}
          onSelectRun={handleSelectRun}
          onNewRun={handleNewRun}
          onOpenAbout={() => setAboutOpen(true)}
        />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main workspace */}
      <main className="relative flex-1 flex flex-col min-w-0 z-10">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-violet-200 dark:border-violet-900/30">
          <button onClick={() => setSidebarOpen(true)} className="text-violet-600 dark:text-violet-300">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="font-bold text-violet-900 dark:text-white">Scout</span>
          <ThemeToggle className="ml-auto" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {/* Hero (idle) */}
            {!hasContent && (
              <div className="text-center pt-8 pb-2">
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  Watch an AI do research
                </h1>
                <p className="text-gray-500 dark:text-violet-200/70 mt-3 max-w-xl mx-auto">
                  Ask a hard question. Scout will plan, search the web, read sources, and write a
                  cited report &mdash; live, one step at a time.
                </p>
              </div>
            )}

            <ResearchInput
              value={question}
              onChange={setQuestion}
              onSubmit={handleSubmit}
              onStop={stop}
              isRunning={isRunning}
              disabled={!question.trim()}
            />

            {state.error && (
              <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {state.error}
              </div>
            )}

            <AgentTrace steps={state.steps} status={state.status} statusLabel={state.statusLabel} />

            {state.report && (
              <ReportView
                report={state.report}
                citations={state.citations}
                stoppedEarly={state.stoppedEarly}
                question={state.question}
              />
            )}

            {state.citations.length > 0 && <SourcesPanel citations={state.citations} />}
          </div>
        </div>
      </main>

      {/* Floating about/close helper for mobile sidebar (kept minimal) */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-3 right-3 z-50 md:hidden text-violet-200"
          aria-label="Close menu"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

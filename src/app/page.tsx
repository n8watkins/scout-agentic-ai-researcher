'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import OnboardingWizard from '@/components/OnboardingWizard';
import AboutModal from '@/components/AboutModal';
import RunHistorySidebar from '@/components/RunHistorySidebar';
import Header from '@/components/Header';
import ResearchInput from '@/components/ResearchInput';
import AgentTrace from '@/components/AgentTrace';
import ReportView from '@/components/ReportView';
import SourcesPanel from '@/components/SourcesPanel';
import ChatPanel from '@/components/ChatPanel';
import DevPanel from '@/components/DevPanel';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useApiKey } from '@/hooks/useApiKey';
import { useModel } from '@/hooks/useModel';
import { useDevView } from '@/hooks/useDevView';
import { useResearchStream } from '@/hooks/useResearchStream';
import type { SavedRun } from '@/lib/agent/types';

export default function Home() {
  const { showWizard, completeOnboarding } = useOnboarding();
  const { apiKey } = useApiKey();
  const { model } = useModel();
  const { devView, toggle: toggleDevView } = useDevView();
  const { state, run, stop, reset, loadSaved } = useResearchStream();

  const [question, setQuestion] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isRunning = state.status === 'running';
  const hasSources = state.citations.length > 0 || isRunning;
  const hasContent = state.steps.length > 0 || state.report || state.status !== 'idle';

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

  return (
    <div className="relative h-screen overflow-hidden flex bg-slate-50 dark:bg-slate-950">
      {/* Ambient glow */}
      <div className="scout-orb scout-orb-1" />
      <div className="scout-orb scout-orb-2" />

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

      {/* Main workspace — app shell: header / scrolling body (+ right sources) / chat dock */}
      <main className="relative flex-1 flex flex-col min-w-0 z-10">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          devView={devView}
          onToggleDevView={toggleDevView}
        />

        <div className="flex-1 flex min-h-0">
          {/* Center column — scrolls independently */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {!hasContent && (
                <div className="text-center pt-6 pb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                    Watch an AI do research
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto">
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

              {devView && <DevPanel events={state.telemetry} maxSteps={8} running={isRunning} />}

              {state.report && (
                <ReportView
                  report={state.report}
                  citations={state.citations}
                  stoppedEarly={state.stoppedEarly}
                  question={state.question}
                  streaming={isRunning}
                />
              )}

              {/* Sources inline under the report on small screens */}
              {hasSources && (
                <div className="lg:hidden">
                  <SourcesPanel citations={state.citations} running={isRunning} />
                </div>
              )}
            </div>
          </div>

          {/* Sources as a right-side column on large screens */}
          {hasSources && (
            <aside className="hidden lg:block w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 overflow-y-auto p-4">
              <SourcesPanel citations={state.citations} running={isRunning} />
            </aside>
          )}
        </div>

        {/* Sticky chat dock — always reachable once there's a report */}
        {state.report && !isRunning && (
          <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
            <div className="max-w-3xl mx-auto w-full">
              <ChatPanel
                report={state.report}
                citations={state.citations}
                apiKey={apiKey}
                model={model}
                runId={state.runId}
              />
            </div>
          </div>
        )}
      </main>

      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-3 right-3 z-50 md:hidden text-slate-500"
          aria-label="Close menu"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

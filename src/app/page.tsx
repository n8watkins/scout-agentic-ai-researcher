'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import OnboardingWizard from '@/components/OnboardingWizard';
import AboutModal from '@/components/AboutModal';
import RunHistorySidebar from '@/components/RunHistorySidebar';
import Header from '@/components/Header';
import ResearchInput from '@/components/ResearchInput';
import HeroTypewriter from '@/components/HeroTypewriter';
import AgentTrace from '@/components/AgentTrace';
import ReportView from '@/components/ReportView';
import SourcesPanel from '@/components/SourcesPanel';
import ChatThread from '@/components/ChatThread';
import ChatComposer from '@/components/ChatComposer';
import DevPanel from '@/components/DevPanel';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useApiKey } from '@/hooks/useApiKey';
import { useModel } from '@/hooks/useModel';
import { useDevView } from '@/hooks/useDevView';
import { useResearchStream } from '@/hooks/useResearchStream';
import { useChat } from '@/hooks/useChat';
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
  const reportReady = Boolean(state.report) && !isRunning;

  const chat = useChat({
    report: state.report,
    citations: state.citations,
    apiKey,
    model,
    runId: state.runId,
  });

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

  const composer = (
    <ResearchInput
      value={question}
      onChange={setQuestion}
      onSubmit={handleSubmit}
      onStop={stop}
      isRunning={isRunning}
      disabled={!question.trim()}
      showSuggestions={!hasContent}
    />
  );

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
        />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main — app shell: header / scrolling transcript (+ right sources) / bottom composer */}
      <main className="relative flex-1 flex flex-col min-w-0 z-10">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenAbout={() => setAboutOpen(true)}
          devView={devView}
          onToggleDevView={toggleDevView}
        />

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto">
            {!hasContent ? (
              /* Idle: hero + composer vertically centered */
              <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl text-center">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                    Watch Scout research
                  </h1>
                  <p className="mt-2 h-7 truncate text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">
                    <HeroTypewriter />
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-4 mb-6">
                    Ask a hard question &mdash; watch it plan, search, read, and cite, live.
                  </p>
                  {composer}
                </div>
              </div>
            ) : (
              /* Active: question at top, process + answer below; composer is docked */
              <div className="px-4 py-6 md:px-8">
                <div className="max-w-3xl mx-auto w-full space-y-5">
                  {state.question && (
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white break-words">
                      {state.question}
                    </h2>
                  )}

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
                      streaming={isRunning}
                    />
                  )}

                  {/* Follow-up conversation, inline directly below the report */}
                  {reportReady && (
                    <ChatThread
                      messages={chat.messages}
                      streaming={chat.streaming}
                      status={chat.status}
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
            )}
          </div>

          {/* Sources as a wider right-side column on large screens */}
          {hasSources && (
            <aside className="hidden lg:block w-96 xl:w-[28rem] flex-shrink-0 border-l border-slate-200 dark:border-slate-800 overflow-y-auto p-4">
              <SourcesPanel citations={state.citations} running={isRunning} />
            </aside>
          )}
        </div>

        {/* Bottom composer dock: chat once a report is ready, else the research box */}
        {hasContent && (
          <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 backdrop-blur">
            <div className="max-w-3xl mx-auto w-full">
              {reportReady ? (
                <ChatComposer
                  value={chat.input}
                  onChange={chat.setInput}
                  onSend={chat.send}
                  streaming={chat.streaming}
                  error={chat.error}
                />
              ) : (
                <div className="px-3 py-2.5">{composer}</div>
              )}
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

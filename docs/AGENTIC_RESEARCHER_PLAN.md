# Scout — Agentic Research Assistant · One-Shot Build Plan

> **Display name:** Scout
> **Folder:** `scout/`
> **Dev port:** `3100` (so it runs alongside net-trailers:3000, gemini-chat-app:5000, echo:3200)
> **Accent identity:** violet → fuchsia (`from-violet-600 to-fuchsia-600`). Each portfolio app owns a palette: net-trailers = orange/red, gemini = blue/indigo, Scout = violet/fuchsia, Echo = cyan/teal.

---

## 1. The pitch (one sentence)

Ask a hard question, and watch an AI **plan, search the web, read sources, and write a cited report — live, step by step.** Scout doesn't hand you an answer; it shows you the reasoning loop that produced it.

## 2. The thesis the project exists to prove (this is the blog post)

**"An agent is just a while-loop, and *'decide when you're done'* is the hard part."**

Everything in the build should make this legible. The differentiator vs. the existing portfolio: net-trailers does NL→filter search and gemini-chat-app does RAG retrieval; neither shows a **tool-using agent loop** that plans and self-corrects. Scout's whole personality is the visible loop.

Blog beats to design the build around (see §10):
- ReAct loop: think → act (tool) → observe → repeat → answer.
- Why it loops forever or quits too early, and how a **step cap + explicit stop condition** tame it.
- **Hallucination defense:** the report may only assert what a fetched source supports; every claim carries a citation.
- Why **Server-Sent Events (SSE)**, not WebSockets — the stream is one-directional (server → UI), so SSE is the honest choice (and a nice contrast to gemini-chat-app's WebSockets).

## 3. Stack (match the house stack exactly)

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4** (`@import "tailwindcss"` + `@variant dark` like gemini-chat-app's `globals.css`).
- **@google/generative-ai** SDK, model `gemini-3.1-flash-lite` (same as gemini-chat-app), function calling for tools.
- **Heroicons** (`@heroicons/react/24/outline`) + **lucide-react** — same icon libraries the other apps use.
- **better-sqlite3** for saved research runs (same persistence choice as gemini-chat-app; keeps the "production-feel" consistent). Ephemeral disk on free tier is fine — call it out in the README like gemini did.
- **Web search tool:** Tavily API (`/search`, generous free tier, returns clean text) as primary; fall back to Google Programmable Search (`GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID`) so it reuses the same env vars gemini-chat-app already documents.
- **dompurify / isomorphic-dompurify** to sanitize fetched page text before it ever reaches the model or the DOM.
- Deploy target: **Render** free tier (matches gemini-chat-app, so the "spins down after 15 min / ephemeral disk" README section is reusable). Use a long-running `node server.js`-style entry only if needed; pure Next.js `next start` is fine since SSE works over a normal route handler.

## 4. BYOK + demo-key pattern (copy gemini-chat-app's UX)

- Visitor can run immediately on a **shared server demo key** with a **usage meter** (port the `UsageMeter` / `PoolMeterBar` idea).
- "Bring your own free Gemini key" expander in the sidebar and in onboarding step 2 — paste a key, stored client-side, used for unlimited runs.
- Web-search keys stay **server-side only**.

## 5. Directory layout

```
scout/
  src/
    app/
      layout.tsx
      page.tsx                       # main research workspace
      globals.css                    # Tailwind v4 + violet/fuchsia tokens + dark mode
      api/
        research/route.ts            # POST: start a run, returns SSE stream of agent steps
        runs/route.ts                # GET list / POST save run (SQLite)
        runs/[id]/route.ts           # GET one saved run
        usage/route.ts               # demo-pool usage meter (port from gemini)
        healthz/route.ts
    components/
      OnboardingWizard.tsx           # REQUIRED intro modal (see §8)
      AboutContent.tsx               # shared "what is this" content (REQUIRED, see §8)
      AboutModal.tsx                 # sidebar "About" reopen
      ResearchInput.tsx              # question box + "Surprise me" + run button
      AgentTrace.tsx                 # the live step timeline (the star of the show)
      StepCard.tsx                   # one step: thought / tool-call / observation / answer
      ReportView.tsx                 # final report w/ inline citations
      SourcesPanel.tsx               # numbered source list w/ favicons + links
      RunHistorySidebar.tsx          # saved runs
      InlineKeyEntry.tsx             # BYOK (port from gemini)
      UsageMeter.tsx                 # demo-pool meter (port from gemini)
      Modal.tsx                      # base modal shell (port from gemini)
    lib/
      agent/
        loop.ts                      # the ReAct loop (core)
        tools.ts                     # tool definitions + dispatch
        prompts.ts                   # system prompt, planner prompt, synthesis prompt
        types.ts                     # AgentStep, ToolCall, Citation, RunState
      sse.ts                         # SSE helper (encode events)
      gemini.ts                      # model client + key resolution (BYOK vs demo)
      db.ts                          # better-sqlite3 (runs table)
      search.ts                      # Tavily / Google CSE adapters
      sanitize.ts                    # dompurify wrapper for fetched HTML
    hooks/
      useResearchStream.ts           # consume SSE, build step list in state
      useApiKey.ts                   # BYOK state (port from gemini)
      useUsageInfo.ts                # usage meter (port from gemini)
      useOnboarding.ts               # first-run localStorage flag (port from gemini)
  public/images/portrait-medium.jpg  # reuse the same portrait asset
  docs/blog/agents-are-a-while-loop.md
  .env.example
  README.md
```

## 6. The agent loop (core spec — make it explicit, not a black box)

`lib/agent/loop.ts`, server-side, called from `api/research/route.ts`. Pseudocode:

```ts
async function* runAgent(question, { model, maxSteps = 8, signal }) {
  yield step('plan', await planSubQuestions(question))   // optional up-front plan
  const transcript = []
  for (let i = 0; i < maxSteps; i++) {
    // 1. THINK + ACT: ask model for next action via function calling
    const decision = await model.generateContent({
      contents: buildContents(question, transcript),
      tools: TOOLS,                       // web_search, fetch_url, finish
    })
    yield step('thought', decision.text)  // stream the reasoning

    const call = decision.functionCall
    if (!call || call.name === 'finish') break  // STOP CONDITION

    yield step('tool_call', call)               // "Searching: <q>" / "Reading: <url>"
    const observation = await dispatchTool(call) // §7
    transcript.push({ call, observation })
    yield step('observation', truncate(observation))
  }
  // 2. SYNTHESIZE: force a cited answer from gathered observations only
  const report = await synthesize(question, transcript) // §9 citation rules
  yield step('answer', report)
}
```

Hard rules to bake in (these *are* the lessons):
- **`maxSteps` cap** (default 8) — the loop cannot run forever. When hit, synthesize from whatever was gathered and label the report "stopped early (step budget reached)."
- **Explicit `finish` tool** — the model signals done by calling `finish`, not by vibes. This is the "deciding when you're done" mechanic the blog is about.
- **Every step is streamed** as it happens (SSE), so latency feels like progress, not a spinner.
- **Abort support** — client can cancel; pass `AbortSignal` through to fetch/model calls.

## 7. Tools (function-calling schema)

`lib/agent/tools.ts` — Gemini function declarations + a `dispatchTool` switch:

| Tool | Args | Behavior |
|---|---|---|
| `web_search` | `{ query }` | Tavily/Google CSE → return top 5 `{title, url, snippet}`. Assign each a stable source index used for citations. |
| `fetch_url` | `{ url }` | Fetch, strip to readable text (sanitize via `lib/sanitize.ts`), truncate to ~6k tokens. Register as a citable source. |
| `finish` | `{}` | No-op; signals the loop to synthesize. |

Keep the toolset *small and legible* — the point is to show the loop, not build a kitchen sink. (Optional 4th: `calculator` for a quick "agent uses a deterministic tool" demo.)

## 8. The intro modal — REQUIRED, must match house style

Both existing apps gate first-run behind a wizard that **explains what the project is**; gemini-chat-app's `OnboardingWizard.tsx` + `AboutContent.tsx` and net-trailers' `TutorialModal.tsx` are the templates. Scout must have the same.

**`OnboardingWizard.tsx`** — two steps, exact structural match to gemini's:
- Backdrop: `fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4`.
- Panel: `bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full border shadow-2xl max-h-[90vh] flex flex-col`, but swap blue shadow for **violet** (`shadow-violet-500/20`).
- Header: numbered step pills (`About` → `Get started`) using the gradient-active / green-check-done pattern, plus an `XMarkIcon` skip.
- **Step 1 (About):** a violet "thesis" callout box with `SparklesIcon` — *"Scout doesn't just answer — it shows its work. Watch it plan, search, read, and cite, one step at a time. That visible agent loop is the heart of this project."* — followed by `<AboutContent />`.
- **Step 2 (Get started):** "You can run a research question right now" + demo-pool `UsageMeter` + collapsible BYOK `InlineKeyEntry` + a "Surprise me" sample question button.
- Footer: Skip / `Next: Get started →` / `Back` + `Start researching →` gradient buttons (violet/fuchsia).

**`AboutContent.tsx`** — mirror gemini's structure precisely:
- Centered `Welcome to Scout` title.
- Violet gradient intro card with the **same portrait + bio block** ("I'm Nathan, and this is a portfolio project…") and the **same social links row** (GitHub / LinkedIn / X / Portfolio).
- **🌟 Key Features** grid (1→2 col), colored icon cards. Suggested cards:
  - `MagnifyingGlassIcon` — **Live web research** ("searches and reads real sources, not its training data").
  - `ArrowPathIcon` — **Visible agent loop** ("see every think → search → read → write step stream in").
  - `DocumentTextIcon` — **Cited reports** ("every claim links to the source it came from").
  - `KeyIcon` — **Free to try, BYOK optional** (shared demo key / your own Gemini key).
  - `CodeBracketIcon` — **Open source on GitHub**.
  - `ShieldCheckIcon` — **Guardrails** ("step caps, source-grounded answers, sanitized fetches").
- **⚡ Under the hood** 3-col block (Performance / Agent design / Safety) with `✓` bullets — e.g. "ReAct loop w/ step budget", "SSE streaming", "Source-grounded synthesis", "DOMPurify on fetched pages".
- **🛠️ Tech Stack** pill row reusing gemini's exact pill styling: TypeScript · Next.js 16 · React 19 · Tailwind CSS · Gemini AI · SQLite · SSE.
- Reuse the **"Portfolio project showcasing:"** footer line idiom from net-trailers' TutorialModal.

Wire `useOnboarding.ts` (localStorage `scout_onboarding_complete`) exactly like gemini.

## 9. Main UI (`page.tsx`)

Three-region workspace, dark-mode first (Scout leans dark like net-trailers, with violet glow):
- **Left sidebar:** `RunHistorySidebar` (saved runs) + BYOK + About re-open button.
- **Center (the show):** `ResearchInput` at top; below it `AgentTrace` — a vertical timeline of `StepCard`s that **animate in as SSE events arrive**. Step types get distinct visual treatment:
  - *Thought* — muted, italic, lightbulb icon.
  - *Tool call* — violet chip: "🔍 Searching: …" / "📄 Reading: example.com".
  - *Observation* — collapsible source excerpt.
  - *Answer* — promoted into `ReportView`.
  A status line up top cycles: *Planning… → Searching… → Reading… → Writing…* (perceived-progress, the anti-spinner).
- **Right (or below on mobile):** `ReportView` with inline numbered citations `[1]` that scroll to `SourcesPanel`.

**Citation contract (hallucination defense):** the synthesis prompt instructs the model to write claims followed by `[n]` markers referencing only the registered sources, and to add a "Couldn't verify" note for anything it couldn't ground. Render `[n]` as clickable links into `SourcesPanel`.

## 10. Blog post (`docs/blog/agents-are-a-while-loop.md`)

Match gemini-chat-app's blog voice exactly: first-person, self-deprecating, a mermaid diagram, "the demo is where the problems start." Outline:
1. **Hook:** "Everyone says 'AI agent' like it's magic. I built one and found a `for` loop with a step budget and trust issues."
2. **The one idea you need:** think → act → observe → repeat. Mermaid diagram of the ReAct loop (amber-highlight the tool-call nodes like gemini's retrieval diagram).
3. **It worked, then it looped 40 times:** runaway loops; the step cap; *"deciding when you're done"* is a real design problem, not a freebie.
4. **It quit too early:** the opposite failure; tuning the `finish` signal and the planner.
5. **It confidently made things up:** the citation contract; source-grounded synthesis; "Couldn't verify."
6. **Why SSE, not WebSockets:** the stream only flows one way — contrast with the WebSocket app, show I know when *not* to reach for the fancier tool.
7. **What I'd do next / what it taught me about trusting AI output.**

## 11. Env (`.env.example`)

```
GEMINI_API_KEY=            # server demo-key fallback (optional; BYOK preferred)
TAVILY_API_KEY=            # primary web search
GOOGLE_SEARCH_API_KEY=     # fallback search (reuses gemini-chat-app's var name)
GOOGLE_SEARCH_ENGINE_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3100
PORT=3100
```

## 12. Run config (concurrency-safe)

`package.json` scripts:
```json
{
  "dev": "next dev -p 3100",
  "build": "next build",
  "start": "next start -p 3100"
}
```
Port `3100` chosen so all four portfolio apps run simultaneously. See the shared "run all four" note at the bottom of the Echo plan.

## 12a. Known risks & revisions (read before building)

These override anything above where they conflict.

- **Stream at step granularity, not token-level "thoughts."** Gemini returns *either* text *or* a function call per `generateContent` turn — not both reliably. So each loop iteration emits discrete SSE events (`tool_call`, `observation`, and `answer`); a `thought` event is only emitted on turns where the model returns text instead of calling a tool. Do **not** promise a token-by-token reasoning stream.
- **Model strength matters more than the chat default.** `gemini-3.1-flash-lite` is the default per project convention, but lite models often loop without calling `finish` or fabricate citations. Make the model **configurable** (`SCOUT_MODEL` env) and use a **stronger Flash (non-lite) for plan / decide / synthesize** if loop quality is poor. This is the first dial to turn if the agent misbehaves.
- **`fetch_url` SSRF guard (required).** Allow `http`/`https` only; **block private, loopback, and link-local IP ranges** (resolve host first); enforce a request timeout (~8s) and a response-size cap (~2MB). Sanitizing the *content* is not enough — the *request* itself is the risk.
- **Control the context budget.** Don't append raw 6k-token pages across 8 steps. **Summarize each observation** (1–2 paragraphs + key facts) before adding it to the transcript; keep full text only in `SourcesPanel`.
- **Per-run cost.** A run is up to ~8 model calls + searches — far more than one chat message. Size the demo-pool usage meter accordingly and consider a per-IP run cap.
- **SDK:** use the current **`@google/genai`** SDK (better streaming + function-calling ergonomics), not the legacy `@google/generative-ai@0.24` the older apps use. Note the divergence in the README.
- **API key handling:** the Gemini key lives only in `.env.local` (gitignored) — never in committed files, fixtures, or logs.

## 13. One-shot build checklist (order of operations)

1. Scaffold Next.js 16 + TS + Tailwind v4; set `globals.css` tokens (violet/fuchsia light + dark like gemini's blue tokens).
2. `lib/gemini.ts` (key resolution BYOK→demo) + `lib/sse.ts`.
3. `lib/agent/{types,tools,prompts,loop}.ts` — the loop first, prove it in a script.
4. `api/research/route.ts` streaming SSE; `useResearchStream.ts` to consume it.
5. `AgentTrace` + `StepCard` + `ReportView` + `SourcesPanel` — get the live timeline working end to end.
6. SQLite `db.ts` + `runs` routes + `RunHistorySidebar`.
7. **Onboarding wizard + AboutContent + AboutModal** (port gemini's components, reskin violet). Wire `useOnboarding`.
8. BYOK (`InlineKeyEntry`, `useApiKey`) + `UsageMeter` + `/api/usage`.
9. `README.md` (reuse gemini's Render "spins down / ephemeral disk" section) + blog post.
10. Polish: loading/empty/error states, mobile layout, "Surprise me" prompts, keyboard submit.

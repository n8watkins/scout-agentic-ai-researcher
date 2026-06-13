# Scout — Agentic Research Assistant

Ask a hard question, and watch an AI **plan, search the web, read sources, and
write a cited report — live, step by step.** Scout doesn't hand you an answer;
it shows you the reasoning loop that produced it.

It's a portfolio piece with one thesis: **an agent is just a while-loop, and
"decide when you're done" is the hard part.** Everything in the UI is built to
make that legible — the plan, each `think → search → read` step, and the
source-grounded synthesis all stream in as they happen.

**Live demo:** _TODO — set to the Render URL once deployed (Render free tier)._

Heads up before you click: it's on Render's free tier, so if nobody has visited
in 15 minutes the server spins down and the first load takes 30 to 60 seconds
while it wakes up. The free tier also has an **ephemeral disk**, which means
saved research runs (stored in SQLite) reset whenever the server restarts. I
knew both going in and decided they were fine for a demo — runs survive a page
reload, not a redeploy.

## What it does

- **Visible ReAct loop.** Each iteration the model either thinks, calls a tool
  (`web_search` / `fetch_url`), or calls `finish`. Every step is streamed to the
  UI over Server-Sent Events, so latency feels like progress, not a spinner.
- **Cited reports.** The synthesis step may only assert facts supported by a
  fetched source; every claim carries a `[n]` marker that links to the source
  list. Anything it couldn't ground gets a "Couldn't verify" note instead of a
  confident guess.
- **Step budget + explicit stop.** The loop is capped (default 8 steps) and the
  model signals completion by calling the `finish` tool, not by vibes. If the
  budget is hit first, the report is labelled "stopped early."
- **Free to try, BYOK optional.** Runs go on a shared demo key while it has
  capacity; bring your own free Gemini key (stored only in your browser) for
  unlimited runs. The demo key is budgeted by **actual model calls** (one run ≈
  15 calls), hard-capped at 250 calls per rolling 24h — the shared key is split
  with the voice-agent demo. That counter is in-memory/per-process (it resets on
  a cold start and isn't shared across instances); a durable cross-instance cap
  would live in an external KV like Upstash, intentionally not added here.

## How it works

```
question
   │
   ▼
 plan ──► [ think → act(tool) → observe ] ──► finish ──► synthesize (cited)
            ▲                         │
            └─────────── loop ────────┘   (capped at maxSteps)
```

- **`src/lib/agent/loop.ts`** — the loop itself. The whole project in one file.
- **`src/lib/agent/tools.ts`** — three function-calling tools: `web_search`,
  `fetch_url`, `finish`. Deliberately tiny; the point is the loop, not a kitchen
  sink.
- **`src/lib/agent/fetchUrl.ts`** — SSRF-hardened fetcher: http/https only,
  resolves the host and blocks private/loopback/link-local IPs, **follows
  redirects manually and re-validates the host on every hop** (so a 302 or a
  DNS rebind can't slip past the one-time check), 8s timeout, 2MB cap, DOMPurify
  on the content.
- **`src/lib/search.ts`** — Tavily (primary) → Google CSE (fallback) →
  Wikipedia/DuckDuckGo (keyless best-effort, so the demo works with no search
  key configured).
- **`src/app/api/research/route.ts`** — POST starts a run and streams steps as
  SSE. One-directional (server → UI), which is exactly why SSE is the honest
  choice here rather than a WebSocket.

Each observation is **summarized before being added to the agent's working
memory**, so an 8-step run doesn't blow the context window with raw pages — the
full page text lives only in the Sources panel.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **`@google/genai`** (the current SDK — better streaming + function-calling
  ergonomics than the legacy `@google/generative-ai` the older portfolio apps
  use). Model default `gemini-3.1-flash-lite`, configurable via `SCOUT_MODEL`.
- **better-sqlite3** for saved runs · **isomorphic-dompurify** for sanitizing
  fetched pages · **Heroicons** + **lucide-react**.

## Running locally

```bash
npm install
cp .env.example .env.local   # then add your keys (see below)
npm run dev                  # http://localhost:3100
```

Port **3100** is chosen so this runs alongside the other portfolio apps
(net-trailers:3000, gemini-chat-app:5000, voice-agent:3200).

### Environment

```
GEMINI_API_KEY=          # shared demo-key fallback (optional; BYOK preferred)
SCOUT_MODEL=gemini-3.1-flash-lite
TAVILY_API_KEY=          # primary web search (recommended)
GOOGLE_SEARCH_API_KEY=   # fallback search
GOOGLE_SEARCH_ENGINE_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3100
PORT=3100
```

With **no search key**, Scout falls back to Wikipedia's keyless search API, so
the demo produces real citable sources out of the box — add a Tavily key for
broader web coverage. The Gemini key lives only in `.env.local` (gitignored)
and is never written to any committed file or log.

## Scripts

```bash
npm run dev          # next dev -p 3100
npm run build        # production build
npm run start        # next start -p 3100
npm run type-check   # tsc --noEmit
npm test             # vitest run (unit tests)
```

## Deploying to Render

A [`render.yaml`](render.yaml) blueprint is included: a free Node web service
that runs `npm ci && npm run build` (which compiles better-sqlite3's native
addon) and starts Next on Render's injected `$PORT`. Set `GEMINI_API_KEY` and
the optional search keys as dashboard secrets (`sync: false`). The free tier's
disk is ephemeral, so saved runs reset on redeploy — see the note up top.

## The build log

The story behind the loop — runaway iteration, quitting too early, confident
hallucinations, and why SSE over WebSockets — is in
[`docs/blog/agents-are-a-while-loop.md`](docs/blog/agents-are-a-while-loop.md).

---

_Portfolio project by Nathan Watkins. Part of a set: net-trailers (orange),
gemini-chat-app (blue), Scout (violet), Echo (cyan)._

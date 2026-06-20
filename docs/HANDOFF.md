# Scout — session handoff

> Zero-context handoff for **Scout**, an agentic research assistant. Read this in full before working. Don't re-ask decisions recorded here. Build plan: `AGENTIC_RESEARCHER_PLAN.md` (this folder).

## ✅ Current truth
**Audit 2026-06-20:** verified the claims below against the live repo and reconciled the stale session-#1 sections (see "Historical state" footnote at the bottom). The session-#2 header SHA was one commit behind HEAD; corrected here.

- **SHIPPED PUBLIC** at `github.com/n8watkins/scout-agentic-ai-researcher`. Remote `origin` is set; **`master` tracks `origin/master`**, working tree clean apart from these doc changes. (Ignore any older "not pushed / no remote / branch `hardening-pass`" notes — those describe session #1 and are obsolete.)
- **Current HEAD: `06046d9`** ("docs: refresh handoff SHA + note README/blog sync"). Predecessors of note: `a178a5f` (README + lessons-blog sync), `5a0bdf5` (dev panel), `f6c0c3c` (model picker), `40e1264` (favicon + OG cards), `798d8e7` (loop hardening), `64d9d70` (theme toggle).
- **`hardening-pass` is a stale local branch** (last at `189a7ba`, never pushed, superseded by master). Safe to delete; not the working branch.
- Local dir is now **`scout/`** (was `agentic-researcher/`).
- Shipped since session #1: **light/dark theme toggle** (`src/components/ThemeToggle.tsx` + FOUC-safe init script in `layout.tsx` — NOT a hardcoded `className="dark"`), **loop hardening** (duplicate-action + no-progress short-circuit in `loop.ts`: `noProgress` counter + per-query/per-URL dedup), **favicon + OG cards**, a **Gemini model picker** (`MODELS` allowlist + server `pickModel(requested, byok)` gate in `src/lib/gemini.ts`; `SHARED_MODEL = gemini-3.1-flash-lite` is the only model on the shared key, rest BYOK-only), and an **"Under the hood" dev panel** (Beaker toggle → `src/components/DevPanel.tsx`, telemetry in `src/lib/devtrace.ts`), plus README + lessons-blog sync.
- **Tests: 33 passing across 7 files** (`tests/*.test.{ts,tsx}`, Vitest) — verified `vitest run` 2026-06-20. (Earlier notes saying "18/18" or "25" are stale.)
- **Not yet deployed:** README live-demo URL is still a `TODO` (Render free tier; the user handles the deploy). `render.yaml` deploys from `branch: master`.
- Next Scout work: **decide + build embeddings** per `SCOUT_EMBEDDINGS_PLAN.md` (this folder; design only so far — 8 open decisions for the user; Phase 1a = source dedup is the smallest valuable slice).

## What this is
A Next.js app that does **visible, cited web research**: type a question → it plans, runs a ReAct loop (search → read → repeat), and streams a cited report — you watch every step. The thesis (and blog): *an agent is a `while` loop with a budget and a stop condition.*

- **Stack:** Next.js 16 / React 19 / TS / Tailwind v4; `@google/genai` (`gemini-3.1-flash-lite`, configurable `SCOUT_MODEL`); `better-sqlite3` run history; `isomorphic-dompurify`.
- **Transport:** SSE (one-directional agent trace), `src/app/api/research/route.ts`.
- **Tools:** `web_search` (Tavily → Google CSE → keyless Wikipedia fallback), `fetch_url` (SSRF-guarded), `finish`.
- **Port 3100.** `npm run dev` / `npm run build` / `npm test` / `npm run lint`.

## State (verified 2026-06-20)
- Branch **`master`** @ **`06046d9`**, tracking `origin/master`, up to date. Working tree clean apart from this doc reorg. **Pushed to origin** (public). *(The old "branch `hardening-pass` @ `e958587`, no remote, not pushed" line was session-#1 state and is now wrong — corrected.)*
- `npm test` ✅ **33/33** (Vitest, 7 files). `npm run build` / `npm run lint` were green at session #2.
- Demo pool **250 model-calls/day** (counted per call in `loop.ts`, BYOK bypasses) — `src/lib/usage.ts`.
- Run history **scoped per client session** (`x-scout-session` header) + payload caps + write rate limit — `src/app/api/runs/*`, `src/lib/session.ts`, `src/lib/db.ts`.
- **SSRF closed:** `fetch_url` follows redirects manually and re-validates every hop against `isBlockedIp` (blocks private/loopback/link-local incl. `169.254.169.254`, CGNAT, IPv6 ULA/mapped) — `src/lib/agent/fetchUrl.ts`.
- Vitest suite, `render.yaml`, a11y (Esc + focus-trap on `Modal`/`OnboardingWizard` via `useDialogA11y`), dead code removed.

## Gotchas (hard-won)
- **Gemini 3 tool round-trips:** preserve the `thoughtSignature` on `functionCall` parts (collect model parts verbatim from the stream) or the follow-up 400s.
- **Wikipedia, not DuckDuckGo,** is the keyless search fallback — DDG's Instant Answer API returns empty for normal queries.
- The 250 cap is **per-process/in-memory** (resets on Render cold start). Durable = Upstash. Noted in code + README.
- `render.yaml` has `branch: master` — change it if deploying from a different branch.
- `better-sqlite3` is a native module; `next.config.ts` externalizes it. The Render build (`npm ci`) compiles it.

## Next steps (ordered)
1. **Deploy to Render** via `render.yaml` (free tier; the user handles the actual deploy); replace the `TODO` live-demo URL in `README.md`. Wire the subpath `portfolio.n8builds.dev/scout` (per portfolio decisions — `basePath` + rewrites; SSE may need a subdomain fallback).
2. **Decide + build embeddings** per `SCOUT_EMBEDDINGS_PLAN.md` (resolve its 8 open decisions first; Phase 1a = semantic source-dedup is the smallest valuable slice; uses `gemini-embedding-001`).
3. **Optional:** Upstash KV for a durable demo cap (current 250/day cap is in-memory/per-process; resets on Render cold start).
4. **Optional — dev-panel polish (was "Phase 4" of the cross-app dev-panel spec; panel itself shipped at `5a0bdf5`):** persist the panel's open/closed state across reloads, tidy the **mobile layout** of the waterfall, and refine the readouts. Pure polish — the telemetry (`src/lib/devtrace.ts`) and rendering (`src/components/DevPanel.tsx`) are complete.

> **Pending manual QA:** `docs/QA_TESTING.md` lists the can't-be-headless checks (model-picker BYOK gating, dev panel, theme FOUC, onboarding, favicon/OG). All features are built; the QA pass is owed once the app is deployed.

> **Audit 2026-06-20 — completed items removed from this list (were stale):** merging `hardening-pass` + adding a remote/push (done — `master` is public on `origin`); the light/dark theme toggle (done — `ThemeToggle.tsx`, no dead dark-only CSS); ReAct loop hardening / duplicate-URL + no-progress detection (done — `798d8e7`, in `loop.ts`).

## File map
- `src/lib/agent/loop.ts` — the ReAct loop (plan → think/act/observe → finish → synthesize); metered model calls.
- `src/lib/agent/{tools,prompts,types}.ts` — tool decls/dispatch, prompts, step types.
- `src/lib/agent/fetchUrl.ts` — SSRF-guarded fetch (per-hop revalidation).
- `src/lib/usage.ts` — 250/day demo-call cap + per-IP guard.
- `src/lib/{db,session,request}.ts` — SQLite, per-session id, ip/session helpers.
- `src/app/api/research/route.ts` — SSE stream. `src/app/api/runs/*` — per-session history.
- `src/hooks/useResearchStream.ts` — client SSE consumer.
- `src/components/{AgentTrace,StepCard,ReportView,SourcesPanel,RunHistorySidebar,ThemeToggle,DevPanel}.tsx` — UI (incl. theme toggle + "Under the hood" dev panel).
- `src/lib/gemini.ts` — `MODELS` allowlist + `SHARED_MODEL` + `pickModel(requested, byok)` gate · `src/lib/devtrace.ts` — dev-panel telemetry (`TraceEvent`).
- `docs/blog/agents-are-a-while-loop.md` (build log) · `docs/blog/lessons-and-where-agents-are-going.md` (reflection) · `docs/blog/the-state-of-ai-agents.md` (analysis post).
- `tests/*.test.{ts,tsx}` (Vitest, 33 tests) · `render.yaml` (deploys `branch: master`) · `vitest.config.ts`.
- Plan docs (this folder): `AGENTIC_RESEARCHER_PLAN.md` (original build plan) · `SCOUT_EMBEDDINGS_PLAN.md` (embeddings design).

## Shared portfolio decisions (Scout-relevant)
- **Model picker tiers:** `gemini-3.1-flash-lite` is the only model allowed on the **shared** demo key; the rest (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-flash-preview`, `gemini-3.5-flash`) are **BYOK-only** (~20/day each on the free tier). All support function calling. Same `pickModel` gate pattern as Echo.
- **LLM standard:** all generation is `gemini-3.1-flash-lite` via the current `@google/genai` SDK. No Gemini 2.0/2.5 in use for generation. Embeddings would use `gemini-embedding-001`.
- **Domain DECIDED:** `n8builds.dev`; apps attach as subpaths — `portfolio.n8builds.dev/scout`. Deploy = Render free tier (the user runs the deploy).
- **House style:** Scout accent = violet/fuchsia; rounded-2xl modals; required first-run onboarding; light + dark.
- **Git:** Scout → its own `n8watkins` remote (`scout-agentic-ai-researcher`); `master` tracks `origin`. **Never cross-push** to the other portfolio repos. Branch off default before committing. Secrets only in gitignored `.env.local`.

## Historical state (session #1 — kept for provenance, superseded above)
The pre-ship state was: branch `hardening-pass` @ `e958587`, no remote, not pushed, 18 tests, dark-mode-only with dead light CSS, loop guarded only by `maxSteps=8`. All of that has since been resolved (public on `master`, theme toggle shipped, loop hardened, 33 tests) — see "Current truth" at the top. Listed here only so older references in chat/commits resolve to something.

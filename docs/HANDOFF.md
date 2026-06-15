# Scout — session handoff

> Zero-context handoff for **Scout**, an agentic research assistant. Read this in full before working. Don't re-ask decisions recorded here. Portfolio-wide context: `../../HANDOFF.md`. Build plan: `../../AGENTIC_RESEARCHER_PLAN.md`.

## ⚠️ Update — 2026-06-14 (session #2) — read `../../HANDOFF.md` for the full picture
The sections below are from session #1 and are partly stale. Current truth:
- **SHIPPED PUBLIC** at `github.com/n8watkins/scout-agentic-ai-researcher`; `master` tracks `origin`, clean. (Ignore older "not pushed / no remote / branch `hardening-pass`" notes below.)
- Local dir is now **`scout/`** (was `agentic-researcher/`).
- Added since: **light/dark theme toggle**, **loop hardening** (duplicate-action + no-progress short-circuit in `loop.ts`), **favicon + OG cards**, a **Gemini model picker** (`MODELS` allowlist + server `pickModel(requested, byok)` gate in `src/lib/gemini.ts`; only `gemini-3.1-flash-lite` on the shared key, rest BYOK-only), and an **"Under the hood" dev panel** (Beaker toggle → `src/components/DevPanel.tsx`, telemetry in `src/lib/devtrace.ts`), and README + lessons-blog sync. master @ `a178a5f`, 25 tests green.
- Next Scout work: **decide + build embeddings** per `../../SCOUT_EMBEDDINGS_PLAN.md` (design only so far).

## What this is
A Next.js app that does **visible, cited web research**: type a question → it plans, runs a ReAct loop (search → read → repeat), and streams a cited report — you watch every step. The thesis (and blog): *an agent is a `while` loop with a budget and a stop condition.*

- **Stack:** Next.js 16 / React 19 / TS / Tailwind v4; `@google/genai` (`gemini-3.1-flash-lite`, configurable `SCOUT_MODEL`); `better-sqlite3` run history; `isomorphic-dompurify`.
- **Transport:** SSE (one-directional agent trace), `src/app/api/research/route.ts`.
- **Tools:** `web_search` (Tavily → Google CSE → keyless Wikipedia fallback), `fetch_url` (SSRF-guarded), `finish`.
- **Port 3100.** `npm run dev` / `npm run build` / `npm test` / `npm run lint`.

## State (verified this session)
- Branch **`hardening-pass`**, latest commit **`e958587`** (+ a docs commit adding this file). Working tree clean. **No remote; not pushed.**
- `tsc --noEmit` ✅ · `eslint .` ✅ · `npm run build` ✅ · `npm test` ✅ **18/18**.
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
1. **(User-gated)** merge `hardening-pass` → default branch; add a remote + push if the user wants.
2. **Deploy to Render** via `render.yaml`; replace the TODO live-demo URL in `README.md`.
3. **Optional polish:** Scout is **dark-mode-only** but carries full dead light-mode CSS (`layout.tsx` hardcodes `className="dark"`) — ship a theme toggle or delete the dead classes.
4. **Optional:** loop hardening — duplicate-URL/no-progress detection so a run can't waste steps re-fetching (currently only the `maxSteps=8` cap prevents loops).

## File map
- `src/lib/agent/loop.ts` — the ReAct loop (plan → think/act/observe → finish → synthesize); metered model calls.
- `src/lib/agent/{tools,prompts,types}.ts` — tool decls/dispatch, prompts, step types.
- `src/lib/agent/fetchUrl.ts` — SSRF-guarded fetch (per-hop revalidation).
- `src/lib/usage.ts` — 250/day demo-call cap + per-IP guard.
- `src/lib/{db,session,request}.ts` — SQLite, per-session id, ip/session helpers.
- `src/app/api/research/route.ts` — SSE stream. `src/app/api/runs/*` — per-session history.
- `src/hooks/useResearchStream.ts` — client SSE consumer.
- `src/components/{AgentTrace,StepCard,ReportView,SourcesPanel,RunHistorySidebar}.tsx` — UI.
- `docs/blog/agents-are-a-while-loop.md` (build log) · `docs/blog/lessons-and-where-agents-are-going.md` (reflection).
- `__tests__` / `*.test.ts` (Vitest) · `render.yaml` · `vitest.config.ts`.

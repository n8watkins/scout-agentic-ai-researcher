# Scout — session handoff

> Zero-context handoff for **Scout**, an agentic research assistant. Read this in
> full before working. Don't re-ask decisions recorded here. Original build plan:
> `AGENTIC_RESEARCHER_PLAN.md`; embeddings design: `SCOUT_EMBEDDINGS_PLAN.md`;
> manual QA: `QA_TESTING.md` (all this folder).

## ✅ Current truth (audit 2026-06-20)

- **SHIPPED + DEPLOYED LIVE** at **https://scout-agentic-researcher.onrender.com**
  (Render free tier, service `srv-d8rjiu6gvqtc73f52prg`). `/api/healthz` → 200 and
  `/api/auth/providers` returns `github` — both verified post-deploy this session.
- Repo **`github.com/n8watkins/scout-agentic-ai-researcher`**, public. **`master`
  tracks `origin/master`, clean, HEAD `fe39e68`.** Render `autoDeploy` on `master`.
- **Stack:** Next.js 16 / React 19 / TS / Tailwind v4 · `@google/genai`
  (`gemini-3.1-flash-lite`, `SCOUT_MODEL`) · **libSQL/Turso** saved runs ·
  **NextAuth v4** (GitHub, JWT) · SSE · `isomorphic-dompurify`.

## What this is

Type a question → Scout plans, runs a ReAct loop (search → read → repeat) and
streams a **cited report token-by-token**; you can then **chat with the report**
(grounded-first), and runs+chats **persist** (on-device by default, synced to the
cloud if you sign in). Thesis: *an agent is a `while` loop with a budget and a
stop condition.*

## Persistence model (DECIDED — don't re-litigate)

- **Signed out (default):** runs **and** chats saved **on-device** via IndexedDB
  (`src/lib/clientStore.ts`). Private, survives redeploys, no account.
- **Signed in (GitHub, optional):** runs + chats sync to **Turso**, keyed by the
  GitHub user id (`src/lib/apiStore.ts` → auth-scoped `/api/runs*`). On first
  sign-in, `MigrationPrompt` offers to import on-device runs into the account.
- `src/lib/persistence.ts` `usePersistence()` routes local↔server by auth status.
- Auth provider is **GitHub** (user ruled out Google). Auth is **optional**: with
  no `AUTH_GITHUB_*` set, the sign-in UI hides itself and the app stays local-first.

## What shipped this session (commits, newest first)

- `fe39e68` review fixes (7): chat-persist cross-run/store race; `/api/chat`
  demo-budget gate; `saveRun` UPSERT preserving `chat`; cache-rejected-DB-init
  reset; report-less run → status `error`; empty chat bubble on error; chat
  search-failure/empty-query handling.
- `3f01a96` auth env-var docs · `d18b254` cross-device sync + migrate-on-sign-in ·
  `01222ad` GitHub auth scaffolding (Auth.js v4, graceful).
- `00dc8a4` local-first IndexedDB persistence (runs + chats).
- `08649a3` durable saved-run storage via **libSQL/Turso** (replaced
  `better-sqlite3`; `db.ts` is now async; no native compile on Render).
- `ff00efa` don't persist report-less runs on synthesis failure.
- `5e3f601` chat-with-report (grounded-first hybrid, `/api/chat`).
- `17e2491` report streams token-by-token (typewriter) · `b38addf` sources
  accordion + one-at-a-time reveal · `6082b10` subtle/professional restyle +
  citation-contrast fix.
- `050b12a` / `de4ba13` env-doc tweaks.

## Verified this session

- `npm run type-check`, `npm run lint`, `npm test` (**33/33**, vitest),
  `npm run build` — all green at `fe39e68`.
- libSQL live connection + `saveRun` UPSERT chat-preservation smoke-tested.
- Prod `/api/healthz` 200; prod `/api/auth/providers` lists `github`.

## Env / config

All set both locally (`.env.local`, gitignored) **and** in the Render dashboard
(via the Render API this session):
`GEMINI_API_KEY`, `SCOUT_MODEL`, `SCOUT_DEMO_CALL_BUDGET`, `TAVILY_API_KEY`,
`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`,
`AUTH_SECRET`, `NEXTAUTH_URL` (= prod URL). Google CSE keys optional (search
fallback). `.env.example` documents them all.
- `RENDER_API_KEY` is in `~/.zshenv` (account-wide; lets the CLI/curl manage
  Render — **rotate/delete when done**).

## Next steps (ordered)

1. **[USER — needs a browser]** Test the **GitHub sign-in round-trip on prod**:
   sign in, run a question, confirm the run + a follow-up chat appear after a
   reload and on a second device; confirm the "import N on-device runs" prompt
   works on first sign-in. This is the only thing not verifiable headlessly.
2. **Manual QA pass** — `docs/QA_TESTING.md` (now deployable; covers model
   picker, dev panel, theme/FOUC, onboarding, OG cards, + new auth/chat items).
3. **Security hygiene** — rotate the secrets that passed through chat if the
   transcript is shared: Render API key, GitHub client secret, Turso token.
4. **Embeddings** — `SCOUT_EMBEDDINGS_PLAN.md` (semantic source-dedup, Phase 1a);
   design-only so far; would use `gemini-embedding-001`.
5. **Optional:** Upstash KV for a durable cross-instance demo call cap (current
   250/day cap is in-memory/per-process, resets on cold start).

## Conventions & gotchas (hard-won)

- **Commands:** port **3100**. `npm run dev` / `npm run build` / `npm test` /
  `npm run type-check` / `npm run lint`. Commit per change; Co-Authored-By trailer.
- **Gemini 3 tool round-trips 400** unless `thoughtSignature` is preserved on
  `functionCall` parts → `/api/chat` answers from **fresh contents** rather than
  replaying the function call (no round-trip). The agent loop preserves parts.
- **Report streaming:** synthesis uses `generateContentStream` → emits
  `answer_delta` SSE steps; the client **appends** deltas, the final `answer`
  **replaces** with the full text. A report-less hard-fail emits `error` (no
  `answer`) so it isn't persisted.
- **ChatPanel persist** is gated on a `loadedFor` ref keyed to (backend, runId)
  so a run switch / auth flip can't save the wrong thread (see `fe39e68`).
- **`db.saveRun` is an UPSERT** (`ON CONFLICT(id) DO UPDATE`) that **excludes the
  `chat` column** — `INSERT OR REPLACE` wiped it.
- **libSQL:** `@libsql/client`, async. Falls back to `file:data/scout.db` when
  `TURSO_*` unset (ephemeral on Render free tier). `next.config.ts` externalizes
  `@libsql/client` + `libsql`. **No `better-sqlite3`, no native compile.**
- **NextAuth v4:** `getServerSession(authOptions)` server-side; `SessionProvider`
  in `layout.tsx`; provider list gated by `AUTH_GITHUB_*`. JWT sessions (no DB
  adapter); only user *data* needs Turso.
- **Render via API:** set env vars `PUT /v1/services/{id}/env-vars/{key}`
  (per-key merge); deploy `POST /v1/services/{id}/deploys`. Service id
  `srv-d8rjiu6gvqtc73f52prg`. Render free tier: cold start 30–60s, ephemeral disk
  (durability comes from Turso).

## File map (key files for the next steps)

- `src/lib/persistence.ts` — `usePersistence()` local↔server router.
- `src/lib/clientStore.ts` — IndexedDB store (anon runs + chats).
- `src/lib/apiStore.ts` — server persistence client (signed-in).
- `src/lib/db.ts` — libSQL store; runs + `chat` column; `getRunChat`/`setRunChat`.
- `src/lib/authOptions.ts` + `src/app/api/auth/[...nextauth]/route.ts` — NextAuth.
- `src/types/next-auth.d.ts` — `session.user.id` augmentation.
- `src/components/AuthControls.tsx` — sign in/out (self-hides if unconfigured).
- `src/components/MigrationPrompt.tsx` — import on-device runs on first sign-in.
- `src/components/ChatPanel.tsx` + `src/app/api/chat/route.ts` — talk-to-report.
- `src/lib/agent/loop.ts` — ReAct loop + streamed synthesis (`answer_delta`).
- `src/components/SourcesPanel.tsx` — accordion + reveal · `ReportView.tsx` —
  typewriter cursor · `src/hooks/useResearchStream.ts` — SSE consumer + save.
- `src/app/api/runs/route.ts` + `[id]/route.ts` + `[id]/chat/route.ts` —
  auth-scoped run/chat persistence.
- `render.yaml` — blueprint (all env vars declared) · `.env.example` — env docs.

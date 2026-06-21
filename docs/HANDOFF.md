# Scout — session handoff

> Zero-context handoff for **Scout**, an agentic research assistant. Read this in
> full before working. Don't re-ask decisions recorded here. Original build plan:
> `AGENTIC_RESEARCHER_PLAN.md`; embeddings design: `SCOUT_EMBEDDINGS_PLAN.md`;
> manual QA: `QA_TESTING.md` (all this folder).

## ✅ Current truth (audit 2026-06-21)

- **SHIPPED + DEPLOYED LIVE** at **https://scout-agentic-researcher.onrender.com**
  (Render free tier, service `srv-d8rjiu6gvqtc73f52prg`). `/api/healthz` → 200 and
  the live deploy is pinned to HEAD — both verified post-deploy this session.
- Repo **`github.com/n8watkins/scout-agentic-ai-researcher`**, public. **`master`
  tracks `origin/master`, clean, HEAD `98de417`** (= live on prod).
- **Stack:** Next.js 16 / React 19 / TS / Tailwind v4 · `@google/genai`
  (`gemini-3.1-flash-lite`, `SCOUT_MODEL`) · **libSQL/Turso** saved runs ·
  **NextAuth v4** (GitHub, JWT) · SSE · `isomorphic-dompurify`.
- **Gates green at `98de417`:** `type-check`, `lint`, `test` (33/33), `build`.

## What this is

Type a question → Scout plans, runs a ReAct loop (search → read → repeat) and
streams a **cited report token-by-token**; you can then **chat with the report**
(grounded-first), and runs+chats **persist** (on-device by default, synced to the
cloud if you sign in). Thesis: *an agent is a `while` loop with a budget and a
stop condition.*

**UI is a single-column "chat-style" flow:** idle → centered hero
("Watch Scout research" + typewriter) with one-line composer; once a run starts,
the **question pins to the top**, then a collapsed live **agent trace**, then the
**plain report** (no card/label), then the **follow-up chat inline below it**,
with the composer **docked at the bottom of the center column** (aligned with the
text, not the full width). **Sources** live in a wider right-side column on
`lg+` (`w-96 xl:w-[28rem]`) and inline under the report on small screens;
clicking a citation `[n]` dispatches a `scout:open-source` event that opens +
scrolls + highlights that source.

## Persistence model (DECIDED — don't re-litigate)

- **Signed out (default):** runs **and** chats saved **on-device** via IndexedDB
  (`src/lib/clientStore.ts`). Private, survives redeploys, no account.
- **Signed in (GitHub, optional):** runs + chats sync to **Turso**, keyed by the
  GitHub user id (`src/lib/apiStore.ts` → auth-scoped `/api/runs*`). On first
  sign-in, `MigrationPrompt` offers to import on-device runs into the account.
- `src/lib/persistence.ts` `usePersistence()` routes local↔server by auth status.
- Auth provider is **GitHub** (user ruled out Google). Auth is **optional**: with
  no `AUTH_GITHUB_*` set, the sign-in UI hides itself and the app stays local-first.

## Design decisions (DECIDED — don't re-litigate)

- **Palette:** slate + a single blue accent (`--accent`). Purple is gone. No
  background boxes behind citation/source numbers — citations are a colored
  superscript numeral (`.citation-link` in `globals.css`).
- **Composer:** single-row search bar — mic (Web Speech) left, auto-grow textarea
  (rows=1, grows to ~14 lines), Research button right, all `items-end`. No focus
  ring (`focus:outline-none focus:border-blue-500`). Suggestion chips + "Surprise
  me" **auto-submit** on click.
- **Suggestions:** two ~50-item pools in `src/lib/sampleQuestions.ts` —
  `SUGGESTIONS` (chips; 6 random per reload via `sampleN`) and `SAMPLE_QUESTIONS`
  ("Surprise me"; `randomSampleQuestion()` is no-repeat via a module-level set).
- **Agent trace** is **collapsed by default** with a one-line live readout of the
  current plan/step while running; expands to per-step cards.
- **Accessibility:** `prefers-reduced-motion` is honored site-wide (`globals.css`).

## UI overhaul shipped this session (commits, newest first)

- `98de417` honor `prefers-reduced-motion` site-wide.
- `4a60852` "+ New research" button in chat composer; bigger citation tap target.
- `9a2f5c8` unify gray→slate across UI; chat input auto-grows.
- `5f55927` 50 suggestion chips + 50-question "Surprise me", randomized no-repeat.
- `35171d2` align composer with content (dock **inside** the center column).
- `1739230` chat flows **inline below the report**; only the input is docked.
- `65fb9e0` chat-style layout, live collapsed trace, citation→source scroll.
- `61ae6af` composer input, auto-run suggestions, usage meter back in sidebar.
- `8fa7b71` compact animated trace, hero fix, blue accents/hover, About audit.
- `df49c7c` voice input, typewriter hero, header pool/About, mobile-first polish.
- `9152af8` app-shell layout — top-right header, sticky chat, sources column.
- `be2f3cd` ditch purple → slate + blue accent; fix contrast; drop number boxes.

### Earlier this session (feature work, pre-overhaul)

- `fe39e68` review fixes (chat-persist race, `/api/chat` demo gate, `saveRun`
  UPSERT preserving `chat`, report-less→`error`, empty-chat handling).
- `d18b254`/`01222ad` GitHub auth + cross-device sync + migrate-on-sign-in.
- `00dc8a4` local-first IndexedDB persistence · `08649a3` durable Turso storage
  (replaced `better-sqlite3`; `db.ts` async; no native compile on Render).
- `5e3f601` chat-with-report (grounded-first hybrid) · `17e2491` report streaming.

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

1. **[USER — Render dashboard]** Turn **Auto-Deploy ON** (Settings → Build &
   Deploy). It did **not** fire reliably this session despite `autoDeploy: true`
   in `render.yaml`, so every deploy had to be triggered manually (see gotcha).
2. **[USER — needs a browser]** Test the **GitHub sign-in round-trip on prod**:
   sign in, run a question, confirm the run + a follow-up chat appear after a
   reload and on a second device; confirm the "import N on-device runs" prompt
   works on first sign-in. Only thing not verifiable headlessly.
3. **Manual QA pass** — `docs/QA_TESTING.md` (covers model picker, dev panel,
   theme/FOUC, onboarding, OG cards, + auth/chat/voice/citation-scroll items).
4. **Security hygiene** — rotate the secrets that passed through chat if the
   transcript is shared: Render API key, GitHub client secret, Turso token.
5. **Embeddings** — `SCOUT_EMBEDDINGS_PLAN.md` (semantic source-dedup, Phase 1a);
   design-only so far; would use `gemini-embedding-001`.
6. **Optional:** Upstash KV for a durable cross-instance demo call cap (current
   250/day cap is in-memory/per-process, resets on cold start).

## Conventions & gotchas (hard-won)

- **Commands:** port **3100**. `npm run dev` / `npm run build` / `npm test` /
  `npm run type-check` / `npm run lint`. Commit per change; Co-Authored-By trailer.
- **DEPLOY (manual, reliable):** Render auto-deploy is flaky here. To ship:
  1. `git push`, then wait for Render's git mirror to catch up (it lags ~1 min).
  2. `POST /v1/services/srv-d8rjiu6gvqtc73f52prg/deploys` with a body that
     **pins the exact commit**: `{"commitId":"<full 40-char SHA>"}`. If you omit
     `commitId`, Render may deploy a **stale** tip (this bit us twice).
  3. Poll `GET /v1/services/.../deploys?limit=1` until `status:"live"` **and** the
     deploy's `commit.id` matches your SHA. Auth: `Bearer $RENDER_API_KEY`.
- **Gemini 3 tool round-trips 400** unless `thoughtSignature` is preserved on
  `functionCall` parts → `/api/chat` answers from **fresh contents** rather than
  replaying the function call (no round-trip). The agent loop preserves parts.
- **Report streaming:** synthesis uses `generateContentStream` → emits
  `answer_delta` SSE steps; the client **appends** deltas, the final `answer`
  **replaces** with full text. A report-less hard-fail emits `error` (no `answer`)
  so it isn't persisted.
- **Chat persist** (`useChat.ts`) is gated on a `loadedFor` ref keyed to
  (backend, runId) so a run switch / auth flip can't save the wrong thread.
- **`db.saveRun` is an UPSERT** (`ON CONFLICT(id) DO UPDATE`) that **excludes the
  `chat` column** — `INSERT OR REPLACE` wiped it.
- **libSQL:** `@libsql/client`, async. Falls back to `file:data/scout.db` when
  `TURSO_*` unset (ephemeral on Render free tier). `next.config.ts` externalizes
  `@libsql/client` + `libsql`. **No `better-sqlite3`, no native compile.**
- **NextAuth v4:** `getServerSession(authOptions)` server-side; `SessionProvider`
  in `layout.tsx`; provider list gated by `AUTH_GITHUB_*`. JWT sessions (no DB
  adapter); only user *data* needs Turso.
- **Citation → source scroll:** there are **two** `SourcesPanel` instances
  (mobile inline + desktop aside), so `getElementById` is ambiguous. Scrolling is
  done via the `scout:open-source` CustomEvent + a ref inside `SourcesPanel`
  (don't reintroduce id-based scroll — it hits the hidden copy).
- **zsh:** no word-splitting on unquoted vars — `for f in $LIST` treats the whole
  list as one item. Use `... | while IFS= read -r f; do …; done`.
- **Write tool needs a prior Read** of the file (a Bash `cat` doesn't count).

## File map (key files)

### UI shell + chat-style layout
- `src/app/page.tsx` — app shell: Header / center column (scroll transcript +
  docked composer) / sources aside. Idle hero vs active layout; routes composer
  between `ResearchInput` (new run) and `ChatComposer` (follow-up).
- `src/components/Header.tsx` — top-right: dev toggle, About, AuthControls, theme.
- `src/components/HeroTypewriter.tsx` — rotating one-line hero subtitle.
- `src/components/ResearchInput.tsx` — single-row composer (mic + auto-grow
  textarea + Research); renders 6 random suggestion chips; chips auto-submit.
- `src/components/AgentTrace.tsx` — collapsed-by-default live trace + step cards.
- `src/components/ReportView.tsx` — plain cited report; citation `[n]` →
  `scout:open-source` event; typewriter cursor while streaming.
- `src/components/SourcesPanel.tsx` — accordion sources; listens for
  `scout:open-source` → opens + scrolls + highlights (ref-based).
- `src/components/ChatThread.tsx` — inline follow-up conversation below report.
- `src/components/ChatComposer.tsx` — docked follow-up input (+ "New research").
- `src/components/RunHistorySidebar.tsx` — history + New research + usage meter +
  ModelPicker + BYOK.
- `src/hooks/useChat.ts` — shared chat state; loads/persists per run; streams
  `/api/chat`. `src/hooks/useSpeechToText.ts` — Web Speech voice input.
- `src/lib/sampleQuestions.ts` — `SUGGESTIONS` + `SAMPLE_QUESTIONS` pools,
  `randomSampleQuestion()` (no-repeat), `sampleN()`.
- `src/app/globals.css` — slate+blue vars, `.citation-link`, thin slate
  scrollbar, typewriter cursor, `prefers-reduced-motion` block.

### Engine + persistence (unchanged this overhaul)
- `src/lib/agent/loop.ts` — ReAct loop + streamed synthesis (`answer_delta`).
- `src/app/api/chat/route.ts` — grounded-first talk-to-report.
- `src/lib/persistence.ts` — `usePersistence()` local↔server router.
- `src/lib/clientStore.ts` (IndexedDB) · `src/lib/apiStore.ts` (signed-in) ·
  `src/lib/db.ts` (libSQL; runs + `chat` column).
- `src/lib/authOptions.ts` + `src/app/api/auth/[...nextauth]/route.ts` — NextAuth.
- `src/app/api/runs/route.ts` + `[id]/route.ts` + `[id]/chat/route.ts` —
  auth-scoped run/chat persistence.
- `src/hooks/useResearchStream.ts` — SSE consumer + save-on-finish.
- `render.yaml` — blueprint (all env vars declared) · `.env.example` — env docs.

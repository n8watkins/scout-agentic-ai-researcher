# Scout — manual QA checklist

> Follow-up manual QA for things that **can't be verified headlessly** (build /
> test / lint already pass — `npm run build`, `npm test` (33 tests), `npm run
> lint`). Check items off as you go; note anything broken under **Findings**.
> Run with `npm run dev` (→ http://localhost:3100). Use **Chrome** for the most
> reliable behavior.
>
> Status: **deployed live** at https://scout-agentic-researcher.onrender.com —
> run this pass against prod (or `npm run dev` locally). All features are on
> `master` @ `fe39e68`.

## Model picker
- [ ] On the **shared key** (no BYOK): only **Gemini 3.1 Flash Lite** is
      selectable; the heavier models (2.5 Flash, 2.5 Flash Lite, 3 Flash Preview,
      3.5 Flash) show "needs your own key" and are disabled.
- [ ] Paste your **own Gemini key** (sidebar BYOK) → the other models **unlock**.
- [ ] Pick a different model with BYOK → responses noticeably differ; verify via
      the dev panel showing the chosen **model id** per call.
- [ ] (Sanity) the server falls back to flash-lite if a non-shared model is
      requested without a key — you can't trick the shared key into the expensive
      models (`pickModel` gate in `src/lib/gemini.ts`).

## "Under the hood" dev panel
- [ ] **🧪 Beaker toggle** (sidebar) → run a research question → panel shows
      per-call **model id**, **tokens in/out**, **latency**, an **estimated $**,
      the raw `web_search` / `fetch_url` results *before* summarization, and a
      **steps-vs-budget** bar.
- [ ] Raw prompt/response accordions default **collapsed** and expand on demand.
- [ ] Toggling off restores the normal product view; preference **persists**
      across reload.

## Theme + polish
- [ ] Light/dark **theme toggle** (sidebar) flips cleanly, with **no flash of the
      wrong theme** on reload (inline init script in `layout.tsx`); sidebar
      legible in **light** mode.
- [ ] **Onboarding wizard** shows on first run; **"About Scout"** modal opens.
- [ ] Modal a11y: **Esc** closes; focus is trapped while open (`useDialogA11y`).

## Share / SEO
- [ ] Browser tab shows the **favicon** (violet "S", `src/app/icon.tsx`).
- [ ] `/opengraph-image` renders locally (`src/app/opengraph-image.tsx`).
- [ ] Post-deploy: pasting the deploy URL into Slack / iMessage shows the **OG
      preview card**.

## Core research loop (spot-check)
- [ ] Ask a question → it **plans**, streams **search → read → observe** steps
      over SSE, then the **report types out token-by-token** (typewriter cursor);
      each `[n]` chip is **legible** and links to the Sources panel.
- [ ] **Sources** reveal one-at-a-time as discovered (count ticks up), and each
      source's description is an **accordion** (collapsed by default).
- [ ] A run **saved** to history reappears after reload; reopening restores the
      report + sources. (Signed out → on-device IndexedDB.)

## Talk to the report (chat)
- [ ] After a report, the **"Ask about this report"** panel answers from the
      report/sources first (no "searched the web" badge for covered questions).
- [ ] Ask something beyond the sources → shows **"searched the web"** and answers
      from fresh results; the reply **streams** in.
- [ ] The chat thread **persists** across reload and when reopening the saved run.

## Sign-in & cross-device sync (GitHub)
- [ ] **Sign in with GitHub** (sidebar) succeeds → shows avatar/name +
      "Synced across devices".
- [ ] First sign-in with existing on-device runs → **"Import N runs"** prompt;
      Import moves them into the account.
- [ ] A run/chat made while signed in appears on a **second device/browser**
      after signing in there (Turso sync).
- [ ] Sign out → back to local-first (on-device runs).

## Findings (fill in during QA)
- …

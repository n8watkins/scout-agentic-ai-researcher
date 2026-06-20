# Scout — manual QA checklist

> Follow-up manual QA for things that **can't be verified headlessly** (build /
> test / lint already pass — `npm run build`, `npm test` (33 tests), `npm run
> lint`). Check items off as you go; note anything broken under **Findings**.
> Run with `npm run dev` (→ http://localhost:3100). Use **Chrome** for the most
> reliable behavior.
>
> Status: all features below are built and on `master`. Manual QA is **still
> pending** (the app is not yet deployed — the README live-demo URL is a `TODO`).

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
      over SSE, then a **cited report**; each `[n]` links to the Sources panel.
- [ ] A run **saved** to history reappears after a page reload (per-session
      SQLite); reopening it restores the report + sources.

## Findings (fill in during QA)
- …

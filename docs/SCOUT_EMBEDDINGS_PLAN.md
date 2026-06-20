# Scout — Embeddings Plan (`gemini-embedding-001`)

**Status:** spec for review — not yet implemented.
**Scope:** Scout only (`/home/natkins/portfolio/examples/scout`). Echo skips embeddings per the prior research pass.
**Date:** 2026-06-14

This document specifies adding semantic embeddings to Scout for two use-cases. It is grounded in the current code; file:line anchors below were read directly, not guessed.

---

## 0. Grounding — where the current code lives

| Concern | File | Key anchors |
| --- | --- | --- |
| ReAct loop (plan → act → observe → synthesize) | `scout/src/lib/agent/loop.ts` | `runAgent` (52), `registerSource` (96–102), `fetch_url` branch (249–325), `summarize` (402–426), `synthesize` (428–451) |
| Web search adapter | `scout/src/lib/search.ts` | `webSearch` (16–51) |
| URL fetch + extract | `scout/src/lib/agent/fetchUrl.ts` | `fetchUrl` (73–188), `MAX_TEXT_CHARS = 24_000` (19), returns `{ ok, url, text, title }` |
| SQLite store | `scout/src/lib/db.ts` | `getDb` (18–48), `runs` table DDL (29–40), `saveRun` (73–88), `listRuns` (98–111) |
| Save path (HTTP) | `scout/src/app/api/runs/route.ts` | `POST` (31–76) → `saveRun(run, sid)` (70) |
| Gemini client | `scout/src/lib/gemini.ts` | `makeClient` (96–98), `SHARED_MODEL = 'gemini-3.1-flash-lite'` (9), `resolveApiKey` (83–93) |
| Demo-key metering | `scout/src/lib/usage.ts` | `recordDemoModelCall` (70–73), `isDemoCallBudgetExhausted` (76–79), `MODEL_CALL_BUDGET = 250` (19) |
| Core types | `scout/src/lib/agent/types.ts` | `Citation` (31–39), `SavedRun` (72–80), `RunOptions` (62–69) |

Two facts that shape the whole design:

1. **`fetchUrl` already returns full extracted text** (`result.text`, up to 24k chars / ~6k tokens) at `loop.ts:298–299`. That text is summarized then dropped from the transcript but retained as `Citation.fullText` (`types.ts:38`). This is exactly the raw material to embed — no new fetching needed.
2. **Demo calls are metered per-call** through one choke point: the `generate` wrapper at `loop.ts:70–80` calls `recordDemoModelCall()` (`loop.ts:74`) on every chat call. Embeddings are a **separate Gemini quota** and must NOT go through `recordDemoModelCall` — they need their own counter (see §4).

---

## 1. The two use-cases

### 1a. Semantic source dedup / ranking (before summarize)

**Problem today.** Dedup is purely lexical:
- `issuedQueries` / `fetchedUrls` sets (`loop.ts:90–91`) only catch *exact* repeat queries and *normalized-URL* re-fetches (`normalizeUrl` at `loop.ts:518–529`).
- Two different URLs with near-identical content (e.g. a press release syndicated across three outlets) each pay a **full summarize call** at `loop.ts:298` and each become a separate citation. That burns demo budget and pollutes the citation list with redundant `[n]` markers.
- There is no relevance gate: a fetched page that turns out to be off-topic still gets summarized and registered.

**The hook.** Inside the `fetch_url` branch, between a successful fetch and the summarize call:

```
loop.ts:293   if (!result.ok) { ... }
loop.ts:295   else {
loop.ts:298     const summary = await summarize(generate, model, question, result.text, signal);  // <-- gate goes ABOVE this
loop.ts:299     const idx = registerSource(result.title, result.url, summary, result.text);
```

Insert a relevance + novelty gate *before* line 298:

1. **Embed the question once per run** with `taskType: 'RETRIEVAL_QUERY'` (cache on the run; it never changes). Do this lazily on the first successful fetch so pure-search runs never embed.
2. **Embed the fetched page** with `taskType: 'RETRIEVAL_DOCUMENT'`. Because a page can be up to 24k chars, embed a **representative chunk** rather than the whole thing — e.g. the first ~2k chars (title + lede) plus the highest-keyword-density window. A single-vector-per-page is sufficient at this scale; full multi-chunk embedding is a later refinement (§5, Phase 3).
3. **Relevance gate:** `cosine(questionVec, pageVec) < REL_THRESHOLD` → skip summarize, register the source with a short snippet but flag it low-relevance (or drop it entirely). This directly saves a summarize call (`loop.ts:298`) on off-topic pages.
4. **Novelty gate:** compare `pageVec` against the vectors of already-registered sources this run. `cosine >= DUP_THRESHOLD` against any prior source → treat as a near-duplicate: do **not** summarize, do **not** add a new citation; instead emit an observation like the existing duplicate short-circuit (`loop.ts:261–271`) pointing the model at the existing `[idx]`, and let `noProgress` increment (`loop.ts:330–334`) so the loop bails out of redundant fetches.

This reuses the existing control-flow vocabulary (short-circuit observation, `noProgress`) rather than inventing new step types. Per-run source vectors live in a local array alongside `citations` (`loop.ts:82`) — they never need to be persisted for this use-case.

**Optional ranking extension.** When synthesis runs (`synthesize`, `loop.ts:428`), sources are currently concatenated in registration order (`loop.ts:439–441`). With per-source vectors already computed, we can order `sourcesBlock` by descending `cosine(questionVec, sourceVec)` so the most on-topic sources lead — cheap, no extra API calls.

**Suggested thresholds (tune in Phase 1):** `DUP_THRESHOLD ≈ 0.92`, `REL_THRESHOLD ≈ 0.55`. These are starting points; the open decision in §6 covers calibration.

### 1b. RAG over run history ("have I researched this before?")

**Problem today.** History is per-session, listed newest-first by `listRuns` (`db.ts:98–111`), and only searchable by the user eyeballing question strings in the sidebar. There is no "you already researched something similar" affordance and no cross-run reuse.

**The hook — write path.** When a run is saved at `route.ts:70` (`saveRun(run, sid)`), also embed and store a vector for the run's **question** (and optionally the report). Two placement options:

- **(Preferred) inside `saveRun`** (`db.ts:73`): keep persistence concerns in one module. `saveRun` becomes `async` (or spawns a fire-and-forget embed) and writes the vector in the same transaction. The POST handler already tolerates a slow save.
- **In the route** (`route.ts:69–71`): embed before calling `saveRun`, pass the vector in. Keeps `db.ts` free of network calls but spreads the logic.

Recommendation: a thin `embedRun(run)` helper in a new `src/lib/embeddings.ts`, called from `saveRun`. Embed the **question** with `taskType: 'RETRIEVAL_DOCUMENT'` (it's the stored document side of the corpus). Embedding the full report is optional and costs more tokens; start with question-only.

**The hook — read path.** A new "related past runs" feature, surfaced two ways:
- **At run start:** before/just after planning (`loop.ts:114–129`), embed the new question with `taskType: 'RETRIEVAL_QUERY'`, cosine-search the session's stored question vectors, and if any past run scores above a threshold, emit a new advisory step ("You researched a related question N days ago: …") so the user can open the prior report instead of re-running. This is the highest-value surface.
- **In the sidebar / history API:** a `findSimilarRuns(sessionId, queryText, k)` exported from `db.ts`, used by a new `GET /api/runs?similarTo=…` mode or the existing list endpoint, to rank/group related history.

Both reuse the same query embedding. Scope every history search to `session_id` (matching `listRuns`' `WHERE session_id = ?` at `db.ts:101`) so visitors never see each other's runs.

---

## 2. The embedding call (`@google/genai`, `gemini-embedding-001`)

Verified against `ai.google.dev/gemini-api/docs/embeddings` and the installed `@google/genai ^1.30.0` (`scout/package.json`). The client is already built by `makeClient(apiKey)` (`gemini.ts:96–98`) returning a `GoogleGenAI`.

**Exact call shape:**

```ts
import type { GoogleGenAI } from '@google/genai';

const res = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: texts,                         // string | string[] — batch in one call
  config: {
    taskType: 'RETRIEVAL_QUERY',           // or RETRIEVAL_DOCUMENT / SEMANTIC_SIMILARITY
    outputDimensionality: 768,             // see recommendation below
  },
});

// One vector per input, in input order:
const vectors: number[][] = (res.embeddings ?? []).map((e) => e.values ?? []);
```

- **Method:** `ai.models.embedContent(...)` (not `generateContent`).
- **`contents`:** accepts a single string or an **array** of strings → batch many texts in one request. Order is preserved in `res.embeddings`.
- **`taskType`** (lowerCamel `taskType` in the JS SDK config):
  - **Query side** (the live research question, history search query): `RETRIEVAL_QUERY`.
  - **Document side** (fetched page chunks, stored run questions): `RETRIEVAL_DOCUMENT`.
  - Asymmetric query/document task types materially improve retrieval quality vs. using `SEMANTIC_SIMILARITY` for both — use the asymmetric pair for 1a and 1b. (`SEMANTIC_SIMILARITY` is only appropriate if we ever do symmetric "are these two questions the same" comparisons.)
- **`outputDimensionality`:** model supports 128–3072 (default 3072). **Recommend 768.** It's the sweet spot for storage (3072 floats ≈ 12 KB/row as JSON vs. ~3 KB at 768) and is more than enough fidelity at Scout's tiny corpus scale, while keeping cosine-in-JS fast. **Important:** dimensions below 3072 are **not unit-normalized by the API** — normalize each vector to unit length in JS once at embed time so cosine reduces to a plain dot product. Pick one dimension and freeze it (mixing dims across rows breaks cosine).

**Batching.** For 1a we embed at most one page per fetch (plus the once-per-run question) — no batching needed; latency is the concern, not request count. For 1b's read path we embed a single query. The only place batching matters is a future **backfill** of existing history (§5, Phase 2): chunk stored questions into arrays of, say, 50 per `embedContent` call.

**Metering.** Embeddings are a **distinct quota** from the chat model (`gemini-3.1-flash-lite`, `gemini.ts:9`). They must **not** call `recordDemoModelCall` (`loop.ts:74` / `usage.ts:70`) — that counter budgets chat calls against the 250/day shared pool. Add a parallel embedding counter (§4).

**BYOK interaction.** `resolveApiKey` (`gemini.ts:83–93`) returns `{ apiKey, byok }`. Embedding calls should use the **same resolved key as the run**:
- BYOK runs (`byok: true`) embed on the visitor's own key → bypass the shared embedding counter entirely, exactly as BYOK chat bypasses `recordDemoModelCall` (`loop.ts:74`).
- Demo runs embed on the shared key → count against the shared embedding RPD cap.
- The 1b write-path embed runs **after** the run, in the save route where the original `byok` flag isn't currently threaded through. Either thread `byok` into the save payload, or default history-embedding to the demo key and gate it on the shared embedding cap. Open decision in §6.

---

## 3. Vector storage in better-sqlite3

`better-sqlite3` (`db.ts`) has **no native vector type**. Two options:

| | JSON/BLOB + cosine-in-JS | `sqlite-vec` extension |
| --- | --- | --- |
| Storage | New `TEXT`/`BLOB` column on `runs`; serialize `number[]` | Virtual table `vec0`, native vector column |
| Search | Load candidate vectors, cosine in JS | `MATCH` / `vec_distance_cosine` in SQL, kNN in-engine |
| Deps | None | Load a compiled extension via `db.loadExtension(...)`; must ship the right binary for the deploy target |
| Scale fit | Fine to low thousands of rows | Built for larger / ANN workloads |
| Ops risk | Zero | Extension loading on Render free tier, native-binary/arch mismatch, packaging |

**Recommendation: JSON/BLOB + cosine-in-JS.** Scout's history is per-session and the disk is **ephemeral on Render's free tier** (noted in `db.ts:8–12` — "runs survive a page reload, not a redeploy"). Realistic corpus is tens, maybe low hundreds, of runs per session. A full scan with JS cosine over that is sub-millisecond. `sqlite-vec` adds a native-extension dependency and deploy fragility for a problem this app doesn't have. Revisit only if history goes durable and large (§6).

Store vectors as a compact **`BLOB` of Float32** (≈3 KB at 768 dims) rather than JSON text (≈12 KB and parse cost): `Buffer.from(new Float32Array(vec).buffer)` on write, `new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength/4)` on read.

**Schema change** (additive, mirrors the existing migration style at `db.ts:42–45`):

```sql
ALTER TABLE runs ADD COLUMN question_embedding BLOB;   -- nullable; old rows stay NULL
ALTER TABLE runs ADD COLUMN embedding_dims INTEGER;    -- guards against dim mixing
ALTER TABLE runs ADD COLUMN embedding_model TEXT;      -- e.g. 'gemini-embedding-001'
```

Guard each `ALTER` with the same `PRAGMA table_info(runs)` check used at `db.ts:42–45`. `findSimilarRuns` then does `SELECT id, question, question_embedding FROM runs WHERE session_id = ? AND question_embedding IS NOT NULL`, decodes each BLOB, computes cosine against the query vector in JS, and returns top-k above threshold. Rows with NULL embeddings (pre-feature or cap-exhausted) are simply skipped — graceful by construction.

Per-run **source vectors** for 1a are *not* persisted — they live only in memory during the run (alongside `citations`, `loop.ts:82`).

---

## 4. Cost / quota

**Limits (free tier, `gemini-embedding-001`):** 100 RPM / **1,000 RPD**, separate from the chat-model quota. Each `embedContent` request = 1 RPD unit regardless of batch size, so batching is free leverage on the RPD cap.

**Per-run embedding load:**
- **1a:** 1 question embed + 1 embed per *successfully fetched* page. With `maxSteps = 8` (`RunOptions`, `types.ts:67`; default at `loop.ts:56`) a run fetches at most a handful of pages → **~1–6 embed requests/run**.
- **1b:** 1 question embed on save + 1 on the read-path similarity check → **~2 embed requests/run**.
- **Total: well under ~10 embed requests per demo run.** At 1,000 RPD that's ~100 demo runs/day of embedding headroom — comfortably above the chat-side ceiling (250 chat calls/day ≈ ~15–20 runs, `usage.ts:9–19`). **The chat quota, not the embedding quota, remains the binding constraint.**

**Token cost** is negligible: a question is tens of tokens; a page chunk capped at ~2k chars is ~500 tokens. Even report embedding (if enabled) is one ~1–2k-token call. On the free tier this is $0; if BYOK on a paid key, embedding pricing is a small fraction of chat.

**Metering + cap.** Add to `usage.ts` a sibling of the chat counter:

```ts
const EMBED_RPD_BUDGET = Number(process.env.SCOUT_EMBED_RPD_BUDGET ?? 900);  // headroom under the 1000 hard cap
export function recordDemoEmbedCall(): void { /* rolling-24h, mirrors recordDemoModelCall (usage.ts:70) */ }
export function isDemoEmbedBudgetExhausted(): boolean { /* mirrors isDemoCallBudgetExhausted (usage.ts:76) */ }
```

Like the chat pool, this is **process-local and in-memory** (`usage.ts:11–16`) — resets on cold start, not shared across instances. Acceptable for a demo; a durable cap would need external KV (same caveat already documented in `usage.ts`).

**Graceful degradation on cap exhaustion (the key requirement):**
- **1a:** if `isDemoEmbedBudgetExhausted()` (or any embed error/timeout) → **skip the relevance/novelty gate and fall back to today's exact-lexical dedup** (`issuedQueries`/`fetchedUrls`, `loop.ts:90–91`) and registration-order synthesis. The run completes identically to current behavior, just without the embedding-based pruning. **No user-visible failure.**
- **1b:** if exhausted on the write path → store the run with `question_embedding = NULL`; it's simply excluded from future similarity search. On the read path → skip the "related runs" advisory. The sidebar list (`listRuns`, `db.ts:98`) is unaffected.
- BYOK runs never hit this cap (they bill the visitor's key), so power users always get the full feature.

All embedding calls must be wrapped so a failure **never throws into the run** — mirror the telemetry-safety discipline already in the loop (`captureModelCall`'s "Telemetry must never break a run", `loop.ts:486–489`).

---

## 5. Phased build plan

Each phase is independently shippable and leaves the app fully working if the next phase never lands.

**Phase 0 — Foundation (no behavior change).**
- New `src/lib/embeddings.ts`: `embedTexts(ai, texts, taskType, dims)` wrapping `ai.models.embedContent` (§2), returning unit-normalized `number[][]`; `cosine(a, b)` (dot product on normalized vectors); BLOB encode/decode helpers.
- New embedding counter + cap helpers in `usage.ts` (§4).
- Unit tests for cosine + encode/decode round-trip (vitest is already set up, `package.json`).
- Risk: none — dead code until wired in.

**Phase 1 — 1a relevance gate (smallest valuable slice).**
- Wire the question + page embed and the **novelty (dedup) gate** into the `fetch_url` branch above `loop.ts:298`. Start with dedup only (highest, clearest payoff: fewer redundant summarize calls + cleaner citations). Single chunk per page.
- Feature-flag via env (`SCOUT_EMBEDDINGS=1`) so it can ship dark and be toggled.
- Add embed events to the dev telemetry buffer (`telemetry`, `loop.ts:63`) so the "Under the hood" panel shows the cosine scores — great for the portfolio story and for threshold tuning.
- Risks: **added latency** — each fetch now waits on an extra round-trip before summarizing (embeds are fast, ~100–300ms, but additive); **threshold calibration** (start conservative, tune from telemetry).

**Phase 2 — 1b history RAG.**
- Schema migration (§3). Embed-on-save in `saveRun` (`db.ts:73`). `findSimilarRuns(sessionId, queryText, k)` in `db.ts`.
- Read-path advisory at run start (`loop.ts` post-plan, ~line 130) and/or a sidebar "related" affordance.
- Optional one-time backfill of existing rows (batched embeds, §2).
- Risks: threading `byok` to the save path (§6); cosine-in-JS scan cost — negligible at expected scale but worth a guard (cap candidates scanned, e.g. most-recent 500).

**Phase 3 — Refinements (optional).**
- Add the **relevance gate** (drop off-topic pages) on top of Phase 1's dedup.
- Synthesis **ranking** by question-source cosine (`loop.ts:439–441`).
- Multi-chunk page embedding (max-sim over chunks) for long pages instead of one representative chunk.
- Report-text embedding for richer history retrieval.

---

## 6. Open decisions (resolve before building)

1. **Thresholds.** `DUP_THRESHOLD` and `REL_THRESHOLD` values — calibrate from Phase 1 telemetry on real runs, or pick conservative defaults (0.92 / 0.55) and iterate?
2. **Output dimensionality.** Confirm **768** (this plan's recommendation) vs. 1536. Whatever is chosen is frozen across all stored vectors; changing it later requires a re-embed/backfill.
3. **History: question-only vs. question+report embedding.** Question-only is cheaper and the obvious "have I asked this before" signal; report embedding helps "related findings" but costs more tokens and storage. Start question-only?
4. **BYOK on the write/read history path.** The save route (`route.ts`) doesn't currently carry the run's `byok` flag. Thread it through (accurate metering, BYOK bypasses cap) vs. always embed history on the demo key (simpler, but counts demo runs' history against the shared cap)?
5. **Dedup action when a near-duplicate is detected.** Hard-drop the source, or keep it but merge into the existing citation / mark it as corroborating? (Affects citation semantics in the report.)
6. **Storage durability vs. `sqlite-vec`.** This plan recommends JSON/BLOB + JS cosine because history is ephemeral and small (`db.ts:8–12`). If history later moves to durable storage and grows, revisit `sqlite-vec`. Confirm we're not planning durable history in the near term.
7. **Feature flag default.** Ship `SCOUT_EMBEDDINGS` defaulting on or off in production? (Recommend off until Phase 1 thresholds are tuned.)
8. **Cross-instance cap.** Accept the in-memory per-instance embedding cap (consistent with the existing chat cap, `usage.ts:11–16`), or invest in external KV now? (Recommend accept — keep the demo dependency-free.)

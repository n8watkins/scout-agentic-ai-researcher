# Building an AI that shows its work — lessons from Scout, and where agents are going

*A reflection on building **Scout**, an agentic research assistant. Less war-story (that's in [agents-are-a-while-loop](./agents-are-a-while-loop.md)), more: what the build actually taught me, why I made the tech choices I made, and how this slots into where AI is heading.*

## The challenge that made it worth building

Everyone has typed a question into a chatbot and gotten a confident paragraph with no idea where it came from. I wanted the opposite: a thing that **does the research in front of you** — plans, searches the live web, reads sources, and writes an answer where every claim points back to where it got it. Not the answer as a magic trick; the answer as a visible process you can audit.

The curiosity underneath: how much of "an AI agent" is the model, and how much is the scaffolding around it? Building one is the fastest way to find out the answer is *mostly the scaffolding*.

## Lesson 1: an agent is a `while` loop with a budget and a stop condition

Strip away the branding and a research agent is:

```
plan → (think → call a tool → read the result) × N → decide you're done → write the answer
```

That's a loop. The two things that make it *work* are unglamorous: a **step budget** (it can't loop forever) and an **explicit `finish` tool** (the model signals "done" by calling a tool, not by vibes). I hand-rolled this loop instead of reaching for a framework, specifically because I wanted to *see* it — the whole point of the project is that the reasoning is legible, and a framework would have hidden the one thing I was trying to learn.

The genuinely hard part is "deciding when you're done." Too eager and it answers from one source; too cautious and it burns the whole step budget circling. That isn't a model problem you can prompt away — it's a control-flow problem you design.

## Lesson 2: the tools are the product, not the model

Scout has three tools: `web_search`, `fetch_url`, `finish`. That restraint was deliberate — the point is to show the loop, not build a kitchen sink. The lesson that surprised me: **most of the quality comes from tool design, not model intelligence.**

Case in point: I first wired the keyless fallback search to DuckDuckGo's Instant Answer API. It returned empty for normal queries, the agent had nothing to read, and it looped uselessly. DuckDuckGo's "Instant Answer" API is *not* a general web search — it answers a narrow set of structured queries. Swapping in Wikipedia's search API (also keyless) gave real, citable articles and the agent immediately worked. The model never changed. The tool did.

## Lesson 3: every tool you give a model is an attack surface

`fetch_url` lets the model retrieve an arbitrary URL server-side. That is, stated plainly, **a server-side request forgery hole**: nudge the agent toward `http://169.254.169.254/` or `http://localhost:6379/` and it'll happily fetch your cloud metadata endpoint or internal Redis. So the fetch tool blocks private, loopback, link-local, and CGNAT ranges (after DNS resolution, not just on the literal string), caps response size, and times out.

This reframed how I think about agents: **the model is a confused deputy with your server's network position.** Sanitizing the *content* it reads is the obvious half; constraining the *requests* it can make is the half tutorials skip.

## Lesson 4: grounding is the whole game

A cited answer and a confident fabrication look identical until you force the citations. Scout's synthesis step is constrained to write claims followed by `[n]` markers that reference only the sources actually fetched, and to flag anything it couldn't verify rather than smooth it over. Unregistered citation numbers render as plain text, so a hallucinated `[7]` can't masquerade as a real link.

This is the same problem the whole industry is circling: an agent that *cites* is supervisable; an agent that just *asserts* is a liability. The grounding isn't a feature on top — it's the thing that makes the output trustworthy enough to be worth generating.

## Lesson 5: tech choices, and knowing when *not* to use the fancy tool

- **SSE over WebSockets.** The agent's trace flows one direction — server to UI. WebSockets are bidirectional and stateful; using them here would be paying for a capability I don't need. SSE over a normal route handler is the honest fit. (The sibling chat app *does* use WebSockets, because there the data genuinely flows both ways. The skill is matching the transport to the data flow.)
- **`@google/genai`, the current SDK.** Cleaner streaming and function-calling than the legacy SDK.
- **A real gotcha:** Gemini 3 rejects a `functionCall` sent back for the tool-result round unless its `thoughtSignature` is preserved. The fix was to collect the model's content parts verbatim from the stream rather than reconstructing them. Nothing in a tutorial prepares you for that; you find it by hitting a 400 and reading carefully.

## Lesson 6: agents don't cost like chat

One chat message is one model call. One Scout run is *up to eight* — plan, several searches and reads, synthesis. On a shared free-tier key with a daily cap, the cost math is completely different, and the rate-limiting has to be sized per-*run*, not per-message. "Agentic" is a multiplier on every cost line, which is easy to forget until the quota evaporates.

## Where this sits in AI right now

This is the **agentic wave**. Through 2025–2026 the center of gravity shifted from "chat with a model" to "give a model tools and a loop." Hosted research agents (the "Deep Research" category) are exactly this pattern at scale; the **Model Context Protocol** is an attempt to standardize the tool layer so agents and tools stop being bespoke per integration. Building Scout by hand is a way of understanding what those products are actually doing under the marketing: a loop, a small set of well-designed tools, a grounding step, and a lot of guardrails.

## What it likely means (the grounded version)

Near-term, tools like this compress the front half of knowledge work — the "go read fifteen sources and summarize with citations" that eats analyst, paralegal, and journalist hours. The realistic shape isn't "the AI does the research"; it's **"the AI does the gathering and you do the judging."** The grounding-and-verification problem is unsolved enough that a human stays in the loop for anything that matters, which means the near-term job shift is toward *supervising* research agents, not being replaced by them.

The less obvious shift is in infrastructure: the value (and the new roles) move into the boring layers — tool protocols, sandboxing the things agents can touch, and *evaluating* whether an agent's output is actually trustworthy. The model is increasingly a commodity; the loop, the tools, and the guardrails around them are where the engineering — and the risk — actually live.

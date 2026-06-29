# Phase 4 — Orchestrator, renderer & OpenCode integration

> Goal: assemble problem → spec → exact lesson → interactive HTML, and wire the
> whole thing into OpenCode using Cloudflare Workers AI as the only provider.

## Pipeline (`src/orchestrator.ts`)

```
problem (text / image)
  → CF model extracts a strict JSON spec   (SPEC_SYSTEM_PROMPT)
  → exact kernel builds the Lesson          (single source of truth)
  → CF model optionally rewrites step prose (narrate; math kept exact)
  → selfCheck: re-run kernel == lesson.answerValue
  → render to standalone HTML
```

- `Orchestrator.renderSpec(spec)` — deterministic, **no model** (tests, offline).
- `Orchestrator.generate({text, imageUrl?})` — full pipeline; image problems use
  the vision model `@cf/meta/llama-3.2-11b-vision-instruct`.
- `Orchestrator.selfCheck` recomputes the answer from the spec and rejects any
  drift > 1e-9. Narration can never corrupt the math: the exact answer is
  re-asserted in the final step.

## Renderer (`src/render/render.ts`)

`renderLesson(lesson)` injects the lesson JSON into the template's
`__LESSON_DATA__` placeholder. The data island is HTML-escaped (`<`, `>`,
U+2028/9) so it cannot break out of the `<script>` tag. Templates:

- `templates/solid.html` — Three.js scene (vertices, edges, highlighted
  line/plane), step navigator, KaTeX.
- `templates/analytic.html` — Canvas conic plot, points, **open/closed range
  bar**, KaTeX.

## OpenCode (`opencode.json`, `.opencode/skills/`, `.claude/skills/`)

- `opencode.json` registers a single custom provider `cloudflare-workers-ai`
  (`@ai-sdk/openai-compatible`) pointed at the Workers AI OpenAI-compatible
  endpoint, with the `@cf/...` model catalog and `{env:...}` credentials. Default
  model: `@cf/moonshotai/kimi-k2.7-code`.
- Two skills (`solid-geometry`, `analytic-geometry`) define the extract → generate
  → deliver workflow and call the `learn-skill` CLI. Copies live under
  `.claude/skills/` for Claude-compatible runtimes.

## CLI (`src/cli.ts`)

`learn-skill spec <file.json>` (deterministic), `learn-skill generate "<text>"`
(`--image`, `--narrate`, `--model`), `learn-skill models`. Dependency-free arg
parsing; credentials from `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`.

## Exit criteria

`render` + `orchestrator` suites green; `learn-skill spec` produces a valid HTML
file with the exact answer for both a solid and an analytic example.

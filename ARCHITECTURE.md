# Architecture report — learn-claude-skill

A complete, independent rewrite that produces interactive, **exactly-computed**
geometry lessons for OpenCode using **Cloudflare Workers AI only**. This document
describes the system, the data flow, and the design decisions.

## 1. Design goals

1. **Exactness.** Answers are rationals and radicals, computed symbolically; never
   floating point. The figure, the steps, and the answer card can never disagree.
2. **Speed & portability.** Pure TypeScript — no Python, no computer-algebra
   system, no interpreter startup. Runs in Node and is embeddable in a Worker.
3. **Model safety.** A language model parses problems and writes prose only. It
   never decides the mathematics, and the result is self-checked.
4. **Single provider.** Cloudflare Workers AI is the only model integration; the
   client refuses anything else.

## 2. High-level flow

```
            ┌──────────────────────────── Cloudflare Workers AI (only) ───────────────────────────┐
            │                                                                                      │
problem ───▶│ spec extractor (Kimi K2.7-code)  ·  vision intake (Llama Vision)  ·  narrator       │
(text/img)  └──────────────────────────────────────────────────────────────────────────────────-─┘
                 │ strict JSON spec                                  ▲ prose only (no numbers)
                 ▼                                                   │
        ┌─────────────────┐     answer + steps + model     ┌─────────────────┐     ┌───────────────┐
        │  exact kernel    │ ─────────────────────────────▶ │  Lesson (JSON)   │ ──▶ │  HTML render   │ ──▶ lesson.html
        │ geometry/analytic│   (single source of truth)     │  + self-check    │     │  (Three/Canvas)│
        └─────────────────┘                                 └─────────────────┘     └───────────────┘
```

## 3. Layers

### 3.1 Exact-math core — `src/exact/`
- **`Rational`** — reduced `bigint` fractions; `+ − × ÷ pow compare abs sign`,
  LaTeX. Immutable, always normalized.
- **`Surd`** — elements of `ℚ(√n₁, √n₂, …)` as `Σ qᵢ·√nᵢ` with squarefree `nᵢ`.
  Closed under `+ − ×`; division by a *single* radical term via rationalization.
  Squarefree normalization (`√8 → 2√2`), exact `√` of a rational.
- **`Vec3`** — exact 3-D vectors: `dot`, `cross`, `normSquared`, `norm`,
  `midpoint`. Kernel constructions keep `normSquared` rational, so `norm` is a
  single radical — exactly what the surd field supports.

Why this domain? Every quantity the coordinate/vector method produces — angles
(via `sin`/`cos` = dot-over-norm-product), distances, volumes — lands in
`ℚ` adjoined square roots. Modelling exactly that is sufficient and minimal.

### 3.2 Cloudflare Workers AI client — `src/cf/`
- OpenAI-compatible wrapper over
  `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1/chat/completions`.
- `chat`, `chatJSON<T>` (balanced-span JSON extraction tolerant of code fences),
  `imageMessage` (multimodal vision intake).
- Timeouts (`AbortController`), retries on 429/5xx/network with exponential
  backoff, typed `CloudflareAIError`, injectable `fetch`.
- **Policy enforcement:** `assertCloudflareModel` (must be `@cf/...`) on
  construction and per call; host allow-list (`api.cloudflare.com`,
  `gateway.ai.cloudflare.com`).

### 3.3 Geometry kernels — `src/geometry/`, `src/analytic/`
- **Solid:** bodies (`cube`, `cuboid`, `regular_quad_pyramid`,
  `regular_tetrahedron`) with exact coordinates; solver for line–plane angle,
  line–line angle, dihedral angle, point–plane distance, volume. Emits the exact
  answer, deterministic narration, and a render model (Three.js y-up mapping).
- **Analytic:** ellipse/parabola results with **explicit open/closed endpoints**
  (`Endpoint{value,closed}`). Inputs are squared semi-axes to stay rational.

Both expose `build*Lesson(spec)` returning a `Lesson` with **no model call**, so
the system is fully usable (and tested) offline.

### 3.4 Orchestrator — `src/orchestrator.ts`
Coordinates the flow, validates the model's spec, runs the kernel, optionally
narrates, and enforces `selfCheck` (kernel answer == lesson answer, ≤1e-9).
Narration cannot corrupt the math: the exact answer is re-asserted in the final
step and re-checked.

### 3.5 Renderer & templates — `src/render/`, `templates/`
`renderLesson` injects the lesson JSON into a template's `__LESSON_DATA__`
placeholder (HTML-escaped against script-tag breakout). `templates/solid.html`
(Three.js scene + step navigator + KaTeX) and `templates/analytic.html` (Canvas
conic + open/closed range bar + KaTeX) read the data island and render — no server
required.

### 3.6 CLI & OpenCode — `src/cli.ts`, `opencode.json`, `.opencode/`, `.claude/`
- `learn-skill spec|generate|models`.
- `opencode.json` wires the single `cloudflare-workers-ai` provider and default
  model `@cf/moonshotai/kimi-k2.7-code`.
- Two skills define the agent workflow; mirrored under `.claude/skills/`.

## 4. The Lesson contract

`src/lesson/types.ts` defines the JSON contract between kernels and renderers:
`kind`, `title`, `problemHtml`, `answerLabel`, `answerLatex`, `answerValue`,
`steps[]`, and a `model` (`SolidModel` 3-D scene or `AnalyticBoard` 2-D scene with
optional `rangeBar`/`constant`).

## 5. Correctness strategy

- **Exact arithmetic** removes rounding entirely.
- **Known-answer tests** anchor each solver (e.g. unit-cube diagonal `sin=√3/3`,
  `cos=1/2` between face diagonals, tetra volume `2√2/3`, ellipse focal-dot range
  `[b²−c², b²]`).
- **Self-check** guards the model-in-the-loop path.
- **Strict tooling:** `tsc` strict (incl. `noUncheckedIndexedAccess`), ESLint with
  `no-explicit-any`, Vitest suite across every layer.

## 6. Security

Secrets via environment only (never logged/committed); model + host allow-list;
escaped data island; dev dependencies audited (0 vulnerabilities).

## 7. Extensibility

Add a body or query to the solid kernel, or a `kind` to the analytic kernel, then
extend `SPEC_SYSTEM_PROMPT` and the relevant template. The exact core and the
client are unchanged.

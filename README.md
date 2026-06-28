# learn-claude-skill

> Interactive, exact math lessons for [OpenCode](https://opencode.ai) — powered
> **exclusively** by [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
> models (Kimi K2.7-code / K2.6, Qwen-Coder, Llama Vision).

`learn-claude-skill` turns a geometry problem into a **self-contained interactive
HTML lesson**: a rotatable 3-D figure (or a plotted conic), step-by-step
narration, and an answer that is **computed exactly** — rationals and radicals,
never floating point. A language model only *reads the problem and writes the
prose*; a deterministic TypeScript kernel owns every number.

- **Author:** Ishaan Gupta
- **License:** [MIT](./LICENSE)
- **Models:** Cloudflare Workers AI only (no other provider exists in the code).

---

## Why

| | Approach |
|---|---|
| **Exact answers** | A custom `Rational` (bigint) + `Surd` (squarefree radicals) field — no CAS, no Python, no rounding. |
| **Fast** | Pure TypeScript; no interpreter startup, trivially embeddable. |
| **Trustworthy** | The model never invents numbers. Every lesson is **self-checked**: the rendered answer must equal the kernel's. |
| **Cloudflare-only** | The single model client refuses any non-`@cf/...` model or non-Cloudflare host. |

## Install

```sh
npm install
npm run build
```

## Use

### Deterministic (no model needed)

Write a problem spec and render it:

```sh
node dist/cli.js spec examples/cube-diagonal.json --out lesson.html
# Answer: \sin\theta = \frac{\sqrt{3}}{3}
```

### From natural language (Cloudflare Workers AI)

```sh
export CLOUDFLARE_ACCOUNT_ID=...        # your account id
export CLOUDFLARE_API_TOKEN=...         # a Workers AI token
node dist/cli.js generate "In a unit cube, find the angle between the space diagonal AC1 and the base ABCD" --out lesson.html
```

`learn-skill models` lists the allowed models.

### Inside OpenCode

`opencode.json` registers a single provider `cloudflare-workers-ai` and two skills
(`solid-geometry`, `analytic-geometry`). With the two env vars set, ask OpenCode a
geometry question and it will produce `lesson.html` in your working directory.

## What it solves

**Solid geometry** (cube, cuboid, regular square pyramid, regular tetrahedron):
line–plane angle, angle between lines, dihedral angle, point–plane distance,
volume.

**Analytic geometry** (ellipse, parabola): focal dot-product **range** (with
correct open/closed endpoints), constant slope product, focal-chord dot product.

## Architecture

```
problem (text/image)
  → CF model extracts a strict JSON spec
  → exact kernel computes the lesson      ← single source of truth
  → CF model optionally rewrites prose
  → self-check (kernel == lesson answer)
  → render to standalone interactive HTML
```

| Layer | Path |
|---|---|
| Exact math (`Rational`, `Surd`, `Vec3`) | `src/exact/` |
| Cloudflare Workers AI client | `src/cf/` |
| Solid-geometry kernel | `src/geometry/` |
| Analytic-geometry kernel | `src/analytic/` |
| Orchestrator + self-check | `src/orchestrator.ts` |
| HTML renderer + templates | `src/render/`, `templates/` |
| CLI | `src/cli.ts` |

Full write-up: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Phase-by-phase build log:
[`docs/`](./docs). Agent behaviour contracts: [`agents.md`](./agents.md),
[`claude.md`](./claude.md).

## Develop

```sh
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint (no-explicit-any, strict rules)
npm test            # vitest (exact-math, client, kernels, render, pipeline)
```

## Security

- Credentials come from environment variables and are never logged or committed.
- The model client only talks to Cloudflare hosts and `@cf/...` models.
- The rendered data island is HTML-escaped to prevent script-tag breakout.

## License

[MIT](./LICENSE) © 2026 Ishaan Gupta.

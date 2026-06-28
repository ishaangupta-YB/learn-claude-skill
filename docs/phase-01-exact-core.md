# Phase 1 — Exact-math core

> Goal: a self-contained exact-arithmetic engine so every answer, coordinate and
> intermediate value is computed **exactly** — no floating point, no CAS
> dependency, no Python. This is the single source of truth the whole product is
> built around.

## Why a custom engine (vs. sympy)

The reference product leaned on Python + sympy. We replace that with a focused
TypeScript engine that is:

- **Faster** — no Python interpreter / sympy import on every invocation; pure
  `bigint` arithmetic.
- **Dependency-free** — nothing to install, trivially embeddable in a Worker, the
  CLI, or a test.
- **Sufficient** — the coordinate/vector method only needs ℚ adjoined square
  roots, which we model exactly.

## The number domain

```
value = Σ qᵢ · √nᵢ        nᵢ squarefree positive integer, qᵢ ∈ ℚ   (n = 1 ⇒ rational part)
```

| Type | Module | Responsibility |
|---|---|---|
| `Rational` | `src/exact/rational.ts` | reduced `bigint` fraction; `+ − × ÷ pow compare abs sign`, LaTeX |
| `Surd` | `src/exact/surd.ts` | element of the domain above; `+ − ×`, **÷ by a single radical**, squarefree normalization, LaTeX |
| `Vec3` | `src/exact/vector.ts` | exact 3-D vectors; `dot`, `cross`, `normSquared`, `norm`, `midpoint` |

### Closure properties (the constraint that makes this work)

- `+ − ×` are fully closed on `Surd`.
- Division is supported **only by a single radical term** `c·√a` (via
  rationalization `1/(c√a) = √a/(c·a)`). Every denominator the kernels create is
  a product of vector norms, i.e. a single radical, so this is exactly enough.
- Kernel constructions keep each vector **component** a single term, so
  `normSquared` is always rational and `norm = √(rational)` is a single radical.

## Correctness anchors (tests)

- `√8 → 2√2`, `√12 → 2√3`, `√4 → 2`; `√(1/3) → √3/3`.
- `√2·√3 = √6`, `√2·√2 = 2`; `1/√2 = √2/2`.
- Canonical line–plane angle: `4 / (√6·√(11/3)) = 2√22/11`.
- `bigint` backing verified against `10³⁰`-scale operands (no overflow).

## Exit criteria

`npm run build`, `npm run lint`, and `npm test` pass; `rational`, `surd`, and
`vector` suites are green.

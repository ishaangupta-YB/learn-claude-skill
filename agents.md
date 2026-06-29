# agents.md — agent behaviour & integration contract

This file defines how any AI agent (OpenCode, or another runtime) must behave when
using `learn-claude-skill`. It is binding: follow it exactly.

## Prime directives

1. **Cloudflare Workers AI only.** Every model call goes through the
   `cloudflare-workers-ai` provider in `opencode.json`, using a `@cf/...` model.
   Never configure, suggest, or fall back to any other provider. The client
   (`src/cf/client.ts`) enforces this and will throw otherwise.
2. **The kernel owns the math.** Agents parse problems and write prose. They must
   never compute, alter, or "correct" a numeric/LaTeX answer. The exact kernel in
   `src/geometry` / `src/analytic` is the single source of truth.
3. **Always self-check.** A lesson is only valid if `Orchestrator.selfCheck`
   passes (kernel answer == rendered answer). If it fails, fix the **spec**, never
   the answer.

## Roles

| Role | Model | Responsibility |
|---|---|---|
| Spec extractor | `@cf/moonshotai/kimi-k2.7-code` (default) | Read the problem → emit a strict JSON `ProblemSpec`. Output JSON only. |
| Vision intake | `@cf/meta/llama-3.2-11b-vision-instruct` | Read a problem supplied as an image, then behave as the spec extractor. |
| Narrator | default text model | Rewrite problem/step prose for clarity. Keep all LaTeX; change no numbers. |

## Spec contract

See `SPEC_SYSTEM_PROMPT` in `src/orchestrator.ts` for the authoritative schema.

- Solid: `{domain:"solid", spec:{body, query}}`. Bodies: `cube`, `cuboid`,
  `regular_quad_pyramid`, `regular_tetrahedron`. Queries: `line_plane_angle`,
  `line_line_angle`, `dihedral`, `distance_point_plane`, `volume`.
- Analytic: `{domain:"analytic", spec:{kind, ...}}`. Kinds: `ellipse_focal_dot`,
  `ellipse_slope_product`, `parabola_focal_chord_dot`. `a2`,`b2` are **squared**
  semi-axes with `a2 > b2`.

## Workflow

1. Extract the spec (JSON only, no prose, no code fences).
2. Generate the lesson via the CLI:
   `learn-skill spec spec.json --out lesson.html`, or end-to-end
   `learn-skill generate "<problem>" --out lesson.html`.
3. Deliver `lesson.html` to the **user's current working directory** and report
   the exact answer the CLI printed (preserve interval bracket types `[ ] ( )`).

## Hard constraints

- Do not invent vertex names outside the body's labelling.
- Do not round, approximate, or reformat the exact answer.
- Do not introduce dependencies on non-Cloudflare services.
- Do not log secrets (`CLOUDFLARE_API_TOKEN`).

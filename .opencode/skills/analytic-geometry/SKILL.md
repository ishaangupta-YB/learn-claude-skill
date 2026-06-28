---
name: analytic-geometry
description: >-
  Turn a 2-D analytic-geometry problem on conics (ellipse, parabola) into a
  self-contained interactive HTML lesson with an exact answer and a plotted
  figure. Use for focal dot-product ranges on an ellipse, constant slope
  products, or focal-chord dot products on a parabola — especially when correct
  open/closed interval endpoints matter.
---

# Analytic Geometry — interactive exact lessons

You produce an interactive 2-D lesson whose answer is computed by an **exact**
kernel. Endpoints of ranges are reported as open or closed correctly — this is
the part students get wrong, so never round or guess.

## Workflow

1. **Extract a spec** with `domain: "analytic"`. Supported `spec.kind`:
   - `ellipse_focal_dot` `{a2,b2,excludeMajorVertices?}` — range of
     `PF₁·PF₂`. `a2`,`b2` are the **squared** semi-axes (`a2 > b2`). Set
     `excludeMajorVertices:true` if the moving point may not be a major-axis
     vertex (this opens the upper endpoint).
   - `ellipse_slope_product` `{a2,b2}` — constant `−b²/a²`.
   - `parabola_focal_chord_dot` `{p}` — for `y²=2px`, `OA·OB = −3p²/4`.
2. **Generate the lesson:**
   ```sh
   learn-skill spec spec.json --out lesson.html
   # or
   learn-skill generate "<the problem>" --out lesson.html
   ```
3. **Deliver** `lesson.html` to the user's working directory; state the exact
   answer (including whether endpoints are open `(` `)` or closed `[` `]`).

## Constraints

- **Cloudflare Workers AI only** (`@cf/...`, configured in `opencode.json`).
- The kernel owns the math; you only parse and narrate.
- Preserve interval bracket types exactly as the kernel reports them.

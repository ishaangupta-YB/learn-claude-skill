---
name: solid-geometry
description: >-
  Turn a 3-D solid-geometry problem (cube, cuboid, regular pyramid, regular
  tetrahedron) into a self-contained interactive HTML lesson with an exact answer
  and a rotatable 3-D figure. Use when the user asks about line–plane angles,
  angles between lines, dihedral angles, point–plane distances, or volumes of
  these solids.
---

# Solid Geometry — interactive exact lessons

You produce an interactive 3-D lesson whose answer is computed by an **exact**
kernel (rationals + radicals; never floating point). You only parse the problem
and write narration — the kernel owns every number.

## Workflow

1. **Extract a spec.** Read the problem and produce a JSON `ProblemSpec` with
   `domain: "solid"`. Bodies and queries:
   - `body`: `{type:"cube",edge}`, `{type:"cuboid",a,b,c}`,
     `{type:"regular_quad_pyramid",side,height}`, `{type:"regular_tetrahedron",edge}`.
   - `query`: `line_plane_angle`, `line_line_angle`, `dihedral`,
     `distance_point_plane`, or `volume`.
   - Vertex names: box/cube `A,B,C,D` (bottom) + `A1,B1,C1,D1` (top); pyramid
     `A,B,C,D` (base) + `P` (apex); tetrahedron `A,B,C,D`.
2. **Generate the lesson.** Run the CLI (it computes the exact answer and renders
   the HTML; it self-checks that the rendered answer equals the kernel answer):
   ```sh
   learn-skill spec spec.json --out lesson.html
   ```
   Or, end-to-end from natural language (uses Cloudflare Workers AI):
   ```sh
   learn-skill generate "<the problem>" --out lesson.html
   ```
3. **Deliver** `lesson.html` to the user's current working directory. Tell them
   the exact answer printed by the CLI.

## Constraints

- **Cloudflare Workers AI only.** Models are configured in `opencode.json`
  (`@cf/...`). Never reference another provider.
- Never edit the computed answer. If the self-check fails, fix the spec, not the
  number.
- Keep all LaTeX intact when writing narration.

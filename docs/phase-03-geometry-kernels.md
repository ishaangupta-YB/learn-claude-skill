# Phase 3 — Geometry kernels

> Goal: the deterministic, model-free solvers that are the single source of truth
> for every lesson. Built entirely on the Phase 1 exact core; no floating point in
> any answer.

## Solid geometry (`src/geometry/`)

### Bodies (`bodies.ts`)
Exact vertex coordinates + edge topology for: `cube`, `cuboid`,
`regularQuadPyramid` (apex above the base centre — rational coords), and
`regularTetrahedron` (exact `√3`/`√6` coordinates; every edge is exactly `a`,
verified in tests).

### Solver (`solid.ts`)
Pure primitives, all returning exact `Surd`:

| Function | Formula |
|---|---|
| `normalFromPoints(a,b,c)` | `(b−a) × (c−a)` |
| `linePlaneAngleSin(d,n)` | `|d·n| / (|d|·|n|)` |
| `lineLineAngleCos(u,v)` | `|u·v| / (|u|·|v|)` |
| `dihedralCos(n₁,n₂)` | `|n₁·n₂| / (|n₁|·|n₂|)` |
| `pointPlaneDistance(p,base,n)` | `|(p−base)·n| / |n|` |

`solveSolid(spec)` dispatches on a query (`line_plane_angle`, `line_line_angle`,
`dihedral`, `distance_point_plane`, `volume`), returning the exact answer plus
deterministic narration. `solidModel` maps exact coords to renderer space
(Three.js y-up: `[x, z, y]`).

Known-answer anchors (tests): unit-cube space diagonal vs. base `sin = √3/3`;
`AB₁`∠`BC₁` `cos = 1/2`; square-pyramid lateral edge `sin = √6/3`; tetra volume
`2√2/3`.

## Analytic geometry (`src/analytic/`)

Inputs are **squared** semi-axes (`a2`, `b2`) so everything stays rational;
eccentricity is an exact `Surd`. The hard part — **open/closed endpoints** — is
modelled explicitly via `Endpoint { value, closed }`.

| Spec | Result |
|---|---|
| `ellipse_focal_dot` | `PF₁·PF₂ ∈ [b²−c², b²]`; upper bound **opens** when major vertices are excluded |
| `ellipse_slope_product` | constant `−b²/a²` |
| `parabola_focal_chord_dot` | constant `−3p²/4` |

`buildAnalyticLesson` emits a `rangeBar` (carrying the open/closed flags) or a
`constant` annotation for the Canvas renderer.

## Exit criteria

`solid` and `analytic` suites green (42 tests total across phases 1–3); build +
lint clean.

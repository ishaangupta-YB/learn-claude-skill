/**
 * Exact vertex coordinates and edge topology for the supported solids. All
 * coordinates are {@link Vec3} over the exact field, so downstream angles and
 * distances stay exact.
 */

import { Rational, rat } from "../exact/rational.js";
import { Surd } from "../exact/surd.js";
import { Vec3 } from "../exact/vector.js";

export interface Body {
  points: Record<string, Vec3>;
  edges: Array<[string, string]>;
}

const R = (x: Rational | number): Surd =>
  Surd.fromRational(typeof x === "number" ? rat(x) : x);

function box(a: Rational, b: Rational, c: Rational): Body {
  const za = Surd.ZERO;
  const A = new Vec3(za, za, za);
  const B = new Vec3(R(a), za, za);
  const C = new Vec3(R(a), R(b), za);
  const D = new Vec3(za, R(b), za);
  const A1 = new Vec3(za, za, R(c));
  const B1 = new Vec3(R(a), za, R(c));
  const C1 = new Vec3(R(a), R(b), R(c));
  const D1 = new Vec3(za, R(b), R(c));
  return {
    points: { A, B, C, D, A1, B1, C1, D1 },
    edges: [
      ["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"],
      ["A1", "B1"], ["B1", "C1"], ["C1", "D1"], ["D1", "A1"],
      ["A", "A1"], ["B", "B1"], ["C", "C1"], ["D", "D1"],
    ],
  };
}

/** Cube with the given edge length. */
export function cube(edge: Rational | number): Body {
  const e = typeof edge === "number" ? rat(edge) : edge;
  return box(e, e, e);
}

/** Axis-aligned cuboid `a × b × c`. */
export function cuboid(a: Rational | number, b: Rational | number, c: Rational | number): Body {
  return box(
    typeof a === "number" ? rat(a) : a,
    typeof b === "number" ? rat(b) : b,
    typeof c === "number" ? rat(c) : c,
  );
}

/**
 * Regular quadrilateral pyramid: square base `ABCD` of side `a` with apex `P`
 * directly above the base centre at height `h`. Coordinates stay rational.
 */
export function regularQuadPyramid(side: Rational | number, height: Rational | number): Body {
  const a = typeof side === "number" ? rat(side) : side;
  const h = typeof height === "number" ? rat(height) : height;
  const half = a.div(rat(2));
  const za = Surd.ZERO;
  const A = new Vec3(za, za, za);
  const B = new Vec3(R(a), za, za);
  const C = new Vec3(R(a), R(a), za);
  const D = new Vec3(za, R(a), za);
  const P = new Vec3(R(half), R(half), R(h));
  return {
    points: { A, B, C, D, P },
    edges: [
      ["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"],
      ["P", "A"], ["P", "B"], ["P", "C"], ["P", "D"],
    ],
  };
}

/**
 * Regular tetrahedron with the given edge length. Uses exact `√3`/`√6`
 * coordinates; every edge length is exactly `a`.
 */
export function regularTetrahedron(edge: Rational | number): Body {
  const a = typeof edge === "number" ? rat(edge) : edge;
  const za = Surd.ZERO;
  const A = new Vec3(za, za, za);
  const B = new Vec3(R(a), za, za);
  // C = (a/2, (√3/2)·a, 0)
  const C = new Vec3(R(a.div(rat(2))), Surd.sqrtOfRational(rat(3)).scale(a.div(rat(2))), za);
  // D = (a/2, (√3/6)·a, (√6/3)·a)
  const D = new Vec3(
    R(a.div(rat(2))),
    Surd.sqrtOfRational(rat(3)).scale(a.div(rat(6))),
    Surd.sqrtOfRational(rat(6)).scale(a.div(rat(3))),
  );
  return {
    points: { A, B, C, D },
    edges: [
      ["A", "B"], ["B", "C"], ["C", "A"],
      ["D", "A"], ["D", "B"], ["D", "C"],
    ],
  };
}

/**
 * Solid-geometry kernel: the coordinate/vector method, computed exactly.
 *
 * Every query reduces to dot/cross products and norms of {@link Vec3}s, so the
 * answer is an exact {@link Surd}. The kernel also emits deterministic default
 * narration and a render model, so a lesson can be produced with zero model
 * calls (the Cloudflare model only *rewrites prose* later).
 */

import { rat } from "../exact/rational.js";
import { Surd } from "../exact/surd.js";
import { Vec3 } from "../exact/vector.js";
import type { Lesson, LessonStep, SolidModel } from "../lesson/types.js";
import {
  cube,
  cuboid,
  regularQuadPyramid,
  regularTetrahedron,
  type Body,
} from "./bodies.js";

export type BodySpec =
  | { type: "cube"; edge: number }
  | { type: "cuboid"; a: number; b: number; c: number }
  | { type: "regular_quad_pyramid"; side: number; height: number }
  | { type: "regular_tetrahedron"; edge: number };

export type QuerySpec =
  | { type: "line_plane_angle"; line: [string, string]; plane: [string, string, string] }
  | { type: "line_line_angle"; line1: [string, string]; line2: [string, string] }
  | { type: "dihedral"; plane1: [string, string, string]; plane2: [string, string, string] }
  | { type: "distance_point_plane"; point: string; plane: [string, string, string] }
  | { type: "volume" };

export interface SolidSpec {
  language?: string;
  title?: string;
  problemHtml?: string;
  body: BodySpec;
  query: QuerySpec;
}

export interface SolidSolution {
  answer: Surd;
  answerLatex: string;
  answerValue: number;
  answerLabel: string;
  steps: LessonStep[];
}

// --- pure exact primitives -------------------------------------------------

/** Plane normal through three points: (b−a) × (c−a). */
export function normalFromPoints(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return b.sub(a).cross(c.sub(a));
}

/** sin of the angle between a line (direction) and a plane (normal). */
export function linePlaneAngleSin(dir: Vec3, normal: Vec3): Surd {
  const denom = dir.norm().mul(normal.norm());
  return dir.dot(normal).abs().divBySingle(denom);
}

/** cos of the (acute) angle between two lines. */
export function lineLineAngleCos(u: Vec3, v: Vec3): Surd {
  const denom = u.norm().mul(v.norm());
  return u.dot(v).abs().divBySingle(denom);
}

/** cos of the (acute) dihedral angle between two planes given their normals. */
export function dihedralCos(n1: Vec3, n2: Vec3): Surd {
  const denom = n1.norm().mul(n2.norm());
  return n1.dot(n2).abs().divBySingle(denom);
}

/** Distance from a point to a plane through `base` with the given `normal`. */
export function pointPlaneDistance(p: Vec3, base: Vec3, normal: Vec3): Surd {
  return p.sub(base).dot(normal).abs().divBySingle(normal.norm());
}

// --- body construction -----------------------------------------------------

export function buildBody(spec: BodySpec): Body {
  switch (spec.type) {
    case "cube":
      return cube(spec.edge);
    case "cuboid":
      return cuboid(spec.a, spec.b, spec.c);
    case "regular_quad_pyramid":
      return regularQuadPyramid(spec.side, spec.height);
    case "regular_tetrahedron":
      return regularTetrahedron(spec.edge);
  }
}

function point(body: Body, name: string): Vec3 {
  const p = body.points[name];
  if (!p) {
    throw new Error(`Unknown vertex "${name}" for this body`);
  }
  return p;
}

// --- volume ----------------------------------------------------------------

function volume(spec: BodySpec): Surd {
  switch (spec.type) {
    case "cube":
      return Surd.fromInt(spec.edge).mul(Surd.fromInt(spec.edge)).mul(Surd.fromInt(spec.edge));
    case "cuboid":
      return Surd.fromInt(spec.a).mul(Surd.fromInt(spec.b)).mul(Surd.fromInt(spec.c));
    case "regular_quad_pyramid": {
      // (1/3)·side²·height
      const base = Surd.fromInt(spec.side).mul(Surd.fromInt(spec.side));
      return base.mul(Surd.fromInt(spec.height)).scale(rat(1, 3));
    }
    case "regular_tetrahedron": {
      // (√2 / 12)·edge³
      const e3 = Surd.fromInt(spec.edge).mul(Surd.fromInt(spec.edge)).mul(Surd.fromInt(spec.edge));
      return e3.mul(Surd.sqrtOfRational(rat(2))).scale(rat(1, 12));
    }
  }
}

// --- solver ----------------------------------------------------------------

export function solveSolid(spec: SolidSpec): SolidSolution {
  const body = buildBody(spec.body);
  const q = spec.query;

  switch (q.type) {
    case "line_plane_angle": {
      const [p1, p2] = q.line;
      const dir = point(body, p2).sub(point(body, p1));
      const n = normalFromPoints(point(body, q.plane[0]), point(body, q.plane[1]), point(body, q.plane[2]));
      const sin = linePlaneAngleSin(dir, n);
      return {
        answer: sin,
        answerLatex: `\\sin\\theta = ${sin.toLatex()}`,
        answerValue: sin.toNumber(),
        answerLabel: "Sine of the line–plane angle",
        steps: [
          coordStep(body),
          {
            title: "Direction vector and plane normal",
            html: `<p>Line ${p1}${p2} has direction $\\vec{d}=${vecLatex(dir)}$. The plane ${q.plane.join("")} has normal $\\vec{n}=${vecLatex(n)}$ (from the cross product of two in-plane vectors).</p>`,
            highlight: [...q.line, ...q.plane],
          },
          {
            title: "Apply the line–plane angle formula",
            html: `<p>$\\sin\\theta = \\dfrac{|\\vec{d}\\cdot\\vec{n}|}{|\\vec{d}|\\,|\\vec{n}|} = ${sin.toLatex()}$.</p>`,
          },
        ],
      };
    }
    case "line_line_angle": {
      const u = point(body, q.line1[1]).sub(point(body, q.line1[0]));
      const v = point(body, q.line2[1]).sub(point(body, q.line2[0]));
      const cos = lineLineAngleCos(u, v);
      return {
        answer: cos,
        answerLatex: `\\cos\\theta = ${cos.toLatex()}`,
        answerValue: cos.toNumber(),
        answerLabel: "Cosine of the angle between the lines",
        steps: [
          coordStep(body),
          {
            title: "Direction vectors",
            html: `<p>$\\vec{u}=${vecLatex(u)}$, $\\vec{v}=${vecLatex(v)}$.</p>`,
            highlight: [...q.line1, ...q.line2],
          },
          {
            title: "Apply the line–line angle formula",
            html: `<p>$\\cos\\theta = \\dfrac{|\\vec{u}\\cdot\\vec{v}|}{|\\vec{u}|\\,|\\vec{v}|} = ${cos.toLatex()}$.</p>`,
          },
        ],
      };
    }
    case "dihedral": {
      const n1 = normalFromPoints(point(body, q.plane1[0]), point(body, q.plane1[1]), point(body, q.plane1[2]));
      const n2 = normalFromPoints(point(body, q.plane2[0]), point(body, q.plane2[1]), point(body, q.plane2[2]));
      const cos = dihedralCos(n1, n2);
      return {
        answer: cos,
        answerLatex: `\\cos\\theta = ${cos.toLatex()}`,
        answerValue: cos.toNumber(),
        answerLabel: "Cosine of the dihedral angle",
        steps: [
          coordStep(body),
          {
            title: "Normals of the two faces",
            html: `<p>$\\vec{n_1}=${vecLatex(n1)}$, $\\vec{n_2}=${vecLatex(n2)}$.</p>`,
            highlight: [...q.plane1, ...q.plane2],
          },
          {
            title: "Apply the dihedral angle formula",
            html: `<p>$\\cos\\theta = \\dfrac{|\\vec{n_1}\\cdot\\vec{n_2}|}{|\\vec{n_1}|\\,|\\vec{n_2}|} = ${cos.toLatex()}$.</p>`,
          },
        ],
      };
    }
    case "distance_point_plane": {
      const base = point(body, q.plane[0]);
      const n = normalFromPoints(base, point(body, q.plane[1]), point(body, q.plane[2]));
      const d = pointPlaneDistance(point(body, q.point), base, n);
      return {
        answer: d,
        answerLatex: `d = ${d.toLatex()}`,
        answerValue: d.toNumber(),
        answerLabel: `Distance from ${q.point} to plane ${q.plane.join("")}`,
        steps: [
          coordStep(body),
          {
            title: "Plane normal",
            html: `<p>Plane ${q.plane.join("")} has normal $\\vec{n}=${vecLatex(n)}$.</p>`,
            highlight: [q.point, ...q.plane],
          },
          {
            title: "Apply the point–plane distance formula",
            html: `<p>$d = \\dfrac{|\\overrightarrow{${q.plane[0]}${q.point}}\\cdot\\vec{n}|}{|\\vec{n}|} = ${d.toLatex()}$.</p>`,
          },
        ],
      };
    }
    case "volume": {
      const vol = volume(spec.body);
      return {
        answer: vol,
        answerLatex: `V = ${vol.toLatex()}`,
        answerValue: vol.toNumber(),
        answerLabel: "Volume",
        steps: [
          coordStep(body),
          {
            title: "Apply the volume formula",
            html: `<p>$V = ${vol.toLatex()}$.</p>`,
          },
        ],
      };
    }
  }
}

function coordStep(body: Body): LessonStep {
  const lines = Object.entries(body.points)
    .map(([name, v]) => `${name}${coordLatex(v)}`)
    .join(",\\; ");
  return {
    title: "Set up coordinates",
    html: `<p>Place the solid in a coordinate frame: $${lines}$.</p>`,
    highlight: Object.keys(body.points),
  };
}

function coordLatex(v: Vec3): string {
  return `(${v.x.toLatex()},\\,${v.y.toLatex()},\\,${v.z.toLatex()})`;
}

function vecLatex(v: Vec3): string {
  return `(${v.x.toLatex()},\\,${v.y.toLatex()},\\,${v.z.toLatex()})`;
}

// --- render model ----------------------------------------------------------

/** Map exact math coords to renderer space (Three.js y-up: [x, z, y]). */
export function solidModel(spec: SolidSpec): SolidModel {
  const body = buildBody(spec.body);
  const points: Record<string, [number, number, number]> = {};
  for (const [name, v] of Object.entries(body.points)) {
    const [x, y, z] = v.toNumbers();
    points[name] = [x, z, y];
  }
  const model: SolidModel = { points, edges: body.edges, camera: [6, 5, 7] };
  const q = spec.query;
  if (q.type === "line_plane_angle") {
    model.line = q.line;
    model.plane = q.plane;
  } else if (q.type === "line_line_angle") {
    model.line = q.line1;
  } else if (q.type === "dihedral") {
    model.plane = q.plane1;
  } else if (q.type === "distance_point_plane") {
    model.plane = q.plane;
  }
  return model;
}

/** Assemble a complete deterministic lesson (no model call required). */
export function buildSolidLesson(spec: SolidSpec): Lesson {
  const sol = solveSolid(spec);
  return {
    kind: "solid",
    language: spec.language ?? "en",
    title: spec.title ?? defaultTitle(spec),
    problemHtml: spec.problemHtml ?? defaultProblem(spec),
    answerLabel: sol.answerLabel,
    answerLatex: sol.answerLatex,
    answerValue: sol.answerValue,
    steps: sol.steps,
    model: solidModel(spec),
  };
}

function bodyName(b: BodySpec): string {
  switch (b.type) {
    case "cube":
      return `cube of edge ${b.edge}`;
    case "cuboid":
      return `cuboid ${b.a}×${b.b}×${b.c}`;
    case "regular_quad_pyramid":
      return `regular quadrilateral pyramid (base ${b.side}, height ${b.height})`;
    case "regular_tetrahedron":
      return `regular tetrahedron of edge ${b.edge}`;
  }
}

function defaultTitle(spec: SolidSpec): string {
  const labels: Record<QuerySpec["type"], string> = {
    line_plane_angle: "Line–plane angle",
    line_line_angle: "Angle between lines",
    dihedral: "Dihedral angle",
    distance_point_plane: "Point–plane distance",
    volume: "Volume",
  };
  return `${labels[spec.query.type]} in a ${bodyName(spec.body)}`;
}

function defaultProblem(spec: SolidSpec): string {
  return `<p>In a ${bodyName(spec.body)}, find the requested quantity using the coordinate method.</p>`;
}

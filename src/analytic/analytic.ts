/**
 * Analytic-geometry kernel: exact conic results with correct **open/closed**
 * endpoint determination — the subtle part the reference product cared about.
 *
 * Inputs use squared semi-axes (`a2 = a²`, `b2 = b²`) so everything stays in ℚ;
 * eccentricities and other irrationals are produced as exact {@link Surd}s.
 */

import { Rational, rat } from "../exact/rational.js";
import { Surd } from "../exact/surd.js";
import type { AnalyticBoard, Lesson, LessonStep } from "../lesson/types.js";

export type AnalyticSpec =
  | {
      kind: "ellipse_focal_dot";
      /** a² (must exceed b²). */
      a2: number;
      /** b². */
      b2: number;
      /** If the moving point excludes the major-axis vertices, the upper bound is open. */
      excludeMajorVertices?: boolean;
      language?: string;
      title?: string;
      problemHtml?: string;
    }
  | {
      kind: "ellipse_slope_product";
      a2: number;
      b2: number;
      language?: string;
      title?: string;
      problemHtml?: string;
    }
  | {
      kind: "parabola_focal_chord_dot";
      /** Parabola y² = 2px. */
      p: number;
      language?: string;
      title?: string;
      problemHtml?: string;
    };

export interface Endpoint {
  value: Rational;
  closed: boolean;
}

export interface AnalyticSolution {
  answerLabel: string;
  answerLatex: string;
  answerValue: number;
  /** Present for range answers. */
  range?: { lo: Endpoint; hi: Endpoint };
  /** Present for constant answers. */
  constant?: Rational;
  steps: LessonStep[];
}

function intervalLatex(lo: Endpoint, hi: Endpoint): string {
  const l = lo.closed ? "[" : "(";
  const r = hi.closed ? "]" : ")";
  return `${l}${lo.value.toLatex()},\\, ${hi.value.toLatex()}${r}`;
}

/** PF₁·PF₂ over an ellipse x²/a² + y²/b² = 1. */
function ellipseFocalDot(a2: Rational, b2: Rational, excludeMajorVertices: boolean): AnalyticSolution {
  if (a2.compare(b2) <= 0) {
    throw new Error("ellipse_focal_dot requires a² > b² > 0");
  }
  const c2 = a2.sub(b2);
  // PF₁·PF₂ = x²·(c²/a²) + (b² − c²); increasing in x² ∈ [0, a²].
  const lo: Endpoint = { value: b2.sub(c2), closed: true }; // x = 0, co-vertices (always included)
  const hi: Endpoint = { value: b2, closed: !excludeMajorVertices }; // x² = a², major vertices
  const e = Surd.sqrtOfRational(c2.div(a2));
  return {
    answerLabel: "Range of $\\vec{PF_1}\\cdot\\vec{PF_2}$",
    answerLatex: intervalLatex(lo, hi),
    answerValue: hi.value.toNumber(),
    range: { lo, hi },
    steps: [
      {
        title: "Set up the ellipse and foci",
        html: `<p>Ellipse $\\dfrac{x^2}{${a2.toLatex()}}+\\dfrac{y^2}{${b2.toLatex()}}=1$ with $c^2=a^2-b^2=${c2.toLatex()}$, eccentricity $e=${e.toLatex()}$.</p>`,
      },
      {
        title: "Express the dot product",
        html: `<p>For $P=(x,y)$, $\\vec{PF_1}\\cdot\\vec{PF_2}=x^2+y^2-c^2$. Substituting $y^2=b^2\\left(1-\\dfrac{x^2}{a^2}\\right)$ gives $\\dfrac{c^2}{a^2}x^2+(b^2-c^2)$, increasing in $x^2\\in[0,a^2]$.</p>`,
      },
      {
        title: "Read off the endpoints",
        html: `<p>Minimum at the co-vertices ($x=0$): $${lo.value.toLatex()}$ (attained). Supremum at the major vertices ($x^2=a^2$): $${hi.value.toLatex()}$ (${hi.closed ? "attained" : "not attained — open"}). Range: $${intervalLatex(lo, hi)}$.</p>`,
      },
    ],
  };
}

/** Product of slopes PA·PA′ to the major-axis vertices: constant −b²/a². */
function ellipseSlopeProduct(a2: Rational, b2: Rational): AnalyticSolution {
  if (a2.compare(b2) <= 0) {
    throw new Error("ellipse_slope_product requires a² > b² > 0");
  }
  const k = b2.div(a2).neg();
  return {
    answerLabel: "Product of slopes $k_{PA}\\cdot k_{PA'}$",
    answerLatex: k.toLatex(),
    answerValue: k.toNumber(),
    constant: k,
    steps: [
      {
        title: "Set up vertices and a moving point",
        html: `<p>Vertices $A(-a,0)$, $A'(a,0)$; $P=(x_0,y_0)$ on $\\dfrac{x^2}{${a2.toLatex()}}+\\dfrac{y^2}{${b2.toLatex()}}=1$.</p>`,
      },
      {
        title: "Compute the slope product",
        html: `<p>$k_{PA}\\cdot k_{PA'}=\\dfrac{y_0}{x_0+a}\\cdot\\dfrac{y_0}{x_0-a}=\\dfrac{y_0^2}{x_0^2-a^2}$. With $y_0^2=b^2\\left(1-\\dfrac{x_0^2}{a^2}\\right)=-\\dfrac{b^2}{a^2}(x_0^2-a^2)$, this is the constant $${k.toLatex()}$.</p>`,
      },
    ],
  };
}

/** OA·OB for a focal chord AB of y² = 2px (p > 0): constant −3p²/4. */
function parabolaFocalChordDot(p: Rational): AnalyticSolution {
  if (p.sign() <= 0) {
    throw new Error("parabola_focal_chord_dot requires p > 0");
  }
  const value = p.mul(p).mul(rat(-3, 4));
  return {
    answerLabel: "$\\vec{OA}\\cdot\\vec{OB}$ for a focal chord",
    answerLatex: value.toLatex(),
    answerValue: value.toNumber(),
    constant: value,
    steps: [
      {
        title: "Set up the parabola and focus",
        html: `<p>Parabola $y^2=${p.mul(rat(2)).toLatex()}x$ (so $2p=${p.mul(rat(2)).toLatex()}$), focus $F\\left(\\dfrac{p}{2},0\\right)$.</p>`,
      },
      {
        title: "Use the focal-chord relations",
        html: `<p>For a focal chord, $y_1y_2=-p^2$ and $x_1x_2=\\dfrac{p^2}{4}$, so $\\vec{OA}\\cdot\\vec{OB}=x_1x_2+y_1y_2=\\dfrac{p^2}{4}-p^2=${value.toLatex()}$.</p>`,
      },
    ],
  };
}

export function solveAnalytic(spec: AnalyticSpec): AnalyticSolution {
  switch (spec.kind) {
    case "ellipse_focal_dot":
      return ellipseFocalDot(rat(spec.a2), rat(spec.b2), spec.excludeMajorVertices ?? false);
    case "ellipse_slope_product":
      return ellipseSlopeProduct(rat(spec.a2), rat(spec.b2));
    case "parabola_focal_chord_dot":
      return parabolaFocalChordDot(rat(spec.p));
  }
}

function analyticBoard(spec: AnalyticSpec, sol: AnalyticSolution): AnalyticBoard {
  if (spec.kind === "parabola_focal_chord_dot") {
    const p = spec.p;
    const board: AnalyticBoard = {
      conic: {
        kind: "parabola",
        equationLatex: `y^2=${2 * p}x`,
        params: { p },
      },
      points: { F: [p / 2, 0], O: [0, 0] },
      view: [-1, 4 * p + 1, -(2 * p + 1), 2 * p + 1],
    };
    if (sol.constant) {
      board.constant = { value: sol.constant.toNumber(), label: sol.answerLabel };
    }
    return board;
  }

  const a2 = spec.a2;
  const b2 = spec.b2;
  const a = Math.sqrt(a2);
  const b = Math.sqrt(b2);
  const c = Math.sqrt(Math.max(a2 - b2, 0));
  const board: AnalyticBoard = {
    conic: {
      kind: "ellipse",
      equationLatex: `\\dfrac{x^2}{${rat(a2).toLatex()}}+\\dfrac{y^2}{${rat(b2).toLatex()}}=1`,
      params: { a, b, c },
    },
    points: { F1: [-c, 0], F2: [c, 0], A: [-a, 0], "A'": [a, 0] },
    view: [-(a + 1), a + 1, -(b + 1), b + 1],
  };
  if (sol.range) {
    board.rangeBar = {
      lo: sol.range.lo.value.toNumber(),
      hi: sol.range.hi.value.toNumber(),
      loClosed: sol.range.lo.closed,
      hiClosed: sol.range.hi.closed,
      label: sol.answerLabel,
    };
  }
  if (sol.constant) {
    board.constant = { value: sol.constant.toNumber(), label: sol.answerLabel };
  }
  return board;
}

function defaultTitle(spec: AnalyticSpec): string {
  switch (spec.kind) {
    case "ellipse_focal_dot":
      return "Range of a focal dot product on an ellipse";
    case "ellipse_slope_product":
      return "Constant slope product on an ellipse";
    case "parabola_focal_chord_dot":
      return "Focal-chord dot product on a parabola";
  }
}

function defaultProblem(spec: AnalyticSpec): string {
  switch (spec.kind) {
    case "ellipse_focal_dot":
      return `<p>For a point $P$ on the ellipse, determine the range of $\\vec{PF_1}\\cdot\\vec{PF_2}$.</p>`;
    case "ellipse_slope_product":
      return `<p>Show that the product of the slopes from a point $P$ to the two major-axis vertices is constant, and find it.</p>`;
    case "parabola_focal_chord_dot":
      return `<p>A focal chord $AB$ of the parabola meets it at $A,B$. Find $\\vec{OA}\\cdot\\vec{OB}$.</p>`;
  }
}

export function buildAnalyticLesson(spec: AnalyticSpec): Lesson {
  const sol = solveAnalytic(spec);
  return {
    kind: "analytic",
    language: spec.language ?? "en",
    title: spec.title ?? defaultTitle(spec),
    problemHtml: spec.problemHtml ?? defaultProblem(spec),
    answerLabel: sol.answerLabel,
    answerLatex: sol.answerLatex,
    answerValue: sol.answerValue,
    steps: sol.steps,
    model: analyticBoard(spec, sol),
  };
}

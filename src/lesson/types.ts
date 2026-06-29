/**
 * The data contract between the deterministic kernels and the HTML renderers.
 *
 * A `Lesson` is the JSON "data island" injected into a template. The kernel is
 * the single source of truth: it fills `answerLatex`/`answerValue` and the
 * default `steps`; a Cloudflare model may *rewrite the prose* of steps/problem,
 * but never the numbers.
 */

export type LessonKind = "solid" | "analytic";

/** One teaching step. `html` may contain LaTeX delimited by `$...$` / `$$...$$`. */
export interface LessonStep {
  title: string;
  html: string;
  /** Names of model elements to emphasize while this step is active. */
  highlight?: string[];
}

/** 3-D scene for the solid-geometry renderer (Three.js, y-up). */
export interface SolidModel {
  /** Vertex name → `[x, y, z]` float coordinates (renderer space). */
  points: Record<string, [number, number, number]>;
  /** Edges as ordered vertex-name pairs. */
  edges: Array<[string, string]>;
  /** A line to emphasise (vertex-name pair). */
  line?: [string, string];
  /** A plane to emphasise (≥3 vertex names). */
  plane?: string[];
  /** Camera position hint `[x, y, z]`. */
  camera?: [number, number, number];
}

/** 2-D scene for the analytic-geometry renderer (Canvas). */
export interface AnalyticBoard {
  /** Conic descriptor for drawing. */
  conic: {
    kind: "ellipse" | "hyperbola" | "parabola" | "circle";
    /** Implicit equation in LaTeX. */
    equationLatex: string;
    /** Float parameters for the drawing engine. */
    params: Record<string, number>;
  };
  /** Named points to plot (float board coordinates). */
  points: Record<string, [number, number]>;
  /** Viewport `[xmin, xmax, ymin, ymax]`. */
  view: [number, number, number, number];
  /** Optional answer interval to highlight on a range bar. */
  rangeBar?: { lo: number; hi: number; loClosed: boolean; hiClosed: boolean; label: string };
  /** Optional constant value annotation. */
  constant?: { value: number; label: string };
}

export type LessonModel = SolidModel | AnalyticBoard;

export interface Lesson {
  kind: LessonKind;
  language: string;
  title: string;
  /** Problem statement (HTML + LaTeX). */
  problemHtml: string;
  answerLabel: string;
  /** Exact answer in LaTeX — produced by the kernel. */
  answerLatex: string;
  /** Numeric answer for self-checking / range bars. */
  answerValue: number;
  steps: LessonStep[];
  model: LessonModel;
}

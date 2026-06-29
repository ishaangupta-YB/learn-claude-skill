import { describe, it, expect } from "vitest";
import { rat } from "../src/exact/rational.js";
import { solveAnalytic, buildAnalyticLesson } from "../src/analytic/analytic.js";

describe("analytic geometry kernel", () => {
  it("ellipse focal dot range [b²-c², b²], both closed over the whole ellipse", () => {
    // a²=4, b²=1 → c²=3 → lo = 1-3 = -2, hi = 1
    const sol = solveAnalytic({ kind: "ellipse_focal_dot", a2: 4, b2: 1 });
    expect(sol.range?.lo.value.equals(rat(-2))).toBe(true);
    expect(sol.range?.lo.closed).toBe(true);
    expect(sol.range?.hi.value.equals(rat(1))).toBe(true);
    expect(sol.range?.hi.closed).toBe(true);
    expect(sol.answerLatex).toBe("[-2,\\, 1]");
  });

  it("opens the upper endpoint when the major-axis vertices are excluded", () => {
    const sol = solveAnalytic({ kind: "ellipse_focal_dot", a2: 4, b2: 1, excludeMajorVertices: true });
    expect(sol.range?.hi.closed).toBe(false);
    expect(sol.range?.lo.closed).toBe(true);
    expect(sol.answerLatex).toBe("[-2,\\, 1)");
  });

  it("ellipse slope product is the constant -b²/a²", () => {
    const sol = solveAnalytic({ kind: "ellipse_slope_product", a2: 4, b2: 3 });
    expect(sol.constant?.equals(rat(-3, 4))).toBe(true);
    expect(sol.answerLatex).toBe("-\\frac{3}{4}");
  });

  it("parabola focal-chord dot product is -3p²/4", () => {
    const sol = solveAnalytic({ kind: "parabola_focal_chord_dot", p: 2 });
    expect(sol.constant?.equals(rat(-3))).toBe(true); // -3·4/4 = -3
    expect(sol.answerValue).toBeCloseTo(-3, 12);
  });

  it("rejects degenerate ellipses and non-positive p", () => {
    expect(() => solveAnalytic({ kind: "ellipse_focal_dot", a2: 1, b2: 4 })).toThrow();
    expect(() => solveAnalytic({ kind: "ellipse_slope_product", a2: 2, b2: 2 })).toThrow();
    expect(() => solveAnalytic({ kind: "parabola_focal_chord_dot", p: 0 })).toThrow();
  });

  it("builds a lesson with a range bar carrying the open/closed flags", () => {
    const lesson = buildAnalyticLesson({ kind: "ellipse_focal_dot", a2: 4, b2: 1, excludeMajorVertices: true });
    expect(lesson.kind).toBe("analytic");
    const board = lesson.model;
    if (!("rangeBar" in board) || !board.rangeBar) {
      throw new Error("expected a range bar");
    }
    expect(board.rangeBar.lo).toBeCloseTo(-2, 12);
    expect(board.rangeBar.hi).toBeCloseTo(1, 12);
    expect(board.rangeBar.hiClosed).toBe(false);
    expect(lesson.answerLatex).toContain("1)");
  });

  it("builds a parabola lesson with a constant annotation", () => {
    const lesson = buildAnalyticLesson({ kind: "parabola_focal_chord_dot", p: 2 });
    const board = lesson.model;
    if (!("constant" in board) || !board.constant) {
      throw new Error("expected a constant annotation");
    }
    expect(board.constant.value).toBeCloseTo(-3, 12);
  });
});

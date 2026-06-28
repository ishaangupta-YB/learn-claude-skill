import { describe, it, expect } from "vitest";
import { rat } from "../src/exact/rational.js";
import {
  solveSolid,
  buildSolidLesson,
  solidModel,
  normalFromPoints,
} from "../src/geometry/solid.js";
import { cube, regularTetrahedron } from "../src/geometry/bodies.js";

describe("solid geometry kernel", () => {
  it("space diagonal vs. base plane in a unit cube → sinθ = √3/3", () => {
    const sol = solveSolid({
      body: { type: "cube", edge: 1 },
      query: { type: "line_plane_angle", line: ["A", "C1"], plane: ["A", "B", "C"] },
    });
    expect(sol.answer.toLatex()).toBe("\\frac{\\sqrt{3}}{3}");
    expect(sol.answerValue).toBeCloseTo(Math.sqrt(3) / 3, 12);
  });

  it("angle between AB1 and BC1 in a unit cube → cosθ = 1/2", () => {
    const sol = solveSolid({
      body: { type: "cube", edge: 1 },
      query: { type: "line_line_angle", line1: ["A", "B1"], line2: ["B", "C1"] },
    });
    expect(sol.answer.toRational().equals(rat(1, 2))).toBe(true);
  });

  it("lateral edge vs. base in a square pyramid (side 2, height 2) → sinθ = √6/3", () => {
    const sol = solveSolid({
      body: { type: "regular_quad_pyramid", side: 2, height: 2 },
      query: { type: "line_plane_angle", line: ["P", "A"], plane: ["A", "B", "C"] },
    });
    expect(sol.answer.toLatex()).toBe("\\frac{\\sqrt{6}}{3}");
  });

  it("dihedral between adjacent perpendicular faces of a cube → cosθ = 0", () => {
    const sol = solveSolid({
      body: { type: "cube", edge: 1 },
      query: { type: "dihedral", plane1: ["A", "B", "C"], plane2: ["A", "B", "B1"] },
    });
    expect(sol.answer.isZero()).toBe(true);
  });

  it("distance from A1 to base plane of a unit cube → 1", () => {
    const sol = solveSolid({
      body: { type: "cube", edge: 1 },
      query: { type: "distance_point_plane", point: "A1", plane: ["A", "B", "C"] },
    });
    expect(sol.answer.toRational().equals(rat(1))).toBe(true);
  });

  it("computes exact volumes", () => {
    expect(
      solveSolid({ body: { type: "cube", edge: 3 }, query: { type: "volume" } }).answer.toRational().equals(rat(27)),
    ).toBe(true);
    expect(
      solveSolid({ body: { type: "cuboid", a: 2, b: 3, c: 4 }, query: { type: "volume" } }).answer.toRational().equals(rat(24)),
    ).toBe(true);
    expect(
      solveSolid({ body: { type: "regular_quad_pyramid", side: 2, height: 3 }, query: { type: "volume" } }).answer.toRational().equals(rat(4)),
    ).toBe(true);
    // regular tetra edge 2 → (√2/12)·8 = 2√2/3
    const tetra = solveSolid({ body: { type: "regular_tetrahedron", edge: 2 }, query: { type: "volume" } });
    expect(tetra.answer.toLatex()).toBe("\\frac{2\\sqrt{2}}{3}");
  });

  it("every edge of a regular tetrahedron has the exact given length", () => {
    const t = regularTetrahedron(2);
    const names = ["A", "B", "C", "D"] as const;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const len = t.points[names[i]]!.sub(t.points[names[j]]!).norm();
        expect(len.toRational().equals(rat(2))).toBe(true);
      }
    }
  });

  it("normalFromPoints yields the expected base normal", () => {
    const c = cube(1);
    const n = normalFromPoints(c.points.A!, c.points.B!, c.points.C!);
    expect(n.toNumbers()).toEqual([0, 0, 1]);
  });

  it("builds a complete lesson whose final step contains the exact answer", () => {
    const lesson = buildSolidLesson({
      body: { type: "cube", edge: 1 },
      query: { type: "line_plane_angle", line: ["A", "C1"], plane: ["A", "B", "C"] },
    });
    expect(lesson.kind).toBe("solid");
    expect(lesson.answerLatex).toContain("\\frac{\\sqrt{3}}{3}");
    const lastStep = lesson.steps[lesson.steps.length - 1]!;
    expect(lastStep.html).toContain("\\frac{\\sqrt{3}}{3}");
    // model is y-up mapped: C1 math (1,1,1) → render [1,1,1]; A at origin
    const model = solidModel({
      body: { type: "cube", edge: 1 },
      query: { type: "line_plane_angle", line: ["A", "C1"], plane: ["A", "B", "C"] },
    });
    expect(model.points.A).toEqual([0, 0, 0]);
    expect(model.line).toEqual(["A", "C1"]);
  });
});

import { describe, it, expect } from "vitest";
import { rat } from "../src/exact/rational.js";
import { Surd } from "../src/exact/surd.js";
import { Vec3 } from "../src/exact/vector.js";

describe("Vec3", () => {
  it("does exact dot and cross products", () => {
    const a = Vec3.of(1, 2, 3);
    const b = Vec3.of(4, 5, 6);
    expect(a.dot(b).toRational().equals(rat(32))).toBe(true); // 4+10+18
    const c = a.cross(b);
    expect(c.x.toRational().equals(rat(-3))).toBe(true);
    expect(c.y.toRational().equals(rat(6))).toBe(true);
    expect(c.z.toRational().equals(rat(-3))).toBe(true);
  });

  it("computes exact norms", () => {
    expect(Vec3.of(3, 4, 0).norm().toRational().equals(rat(5))).toBe(true);
    expect(Vec3.of(1, 1, 1).norm().toLatex()).toBe("\\sqrt{3}");
  });

  it("keeps surd-valued coordinates exact (regular pyramid edge √2)", () => {
    // half-diagonal d = (a/2)·√2 with a = 2 → d = √2
    const d = Surd.term(rat(1), 2n);
    const apex = Vec3.of(Surd.ZERO, Surd.ZERO, Surd.fromInt(2));
    const base = Vec3.of(d, Surd.ZERO, Surd.ZERO);
    const edge = apex.sub(base); // (-√2, 0, 2)
    // |edge|² = 2 + 0 + 4 = 6 (rational), |edge| = √6
    expect(edge.normSquared().toRational().equals(rat(6))).toBe(true);
    expect(edge.norm().toLatex()).toBe("\\sqrt{6}");
  });

  it("midpoint and scaling are exact", () => {
    const m = Vec3.of(0, 0, 0).midpoint(Vec3.of(1, 3, 5));
    expect(m.y.toRational().equals(rat(3, 2))).toBe(true);
  });
});

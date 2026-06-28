import { describe, it, expect } from "vitest";
import { Rational, rat } from "../src/exact/rational.js";
import { Surd } from "../src/exact/surd.js";

const approx = (s: Surd, v: number) => expect(s.toNumber()).toBeCloseTo(v, 10);

describe("Surd", () => {
  it("normalizes radicands to squarefree form", () => {
    // √8 = 2√2
    expect(Surd.term(Rational.ONE, 8n).toLatex()).toBe("2\\sqrt{2}");
    // √12 = 2√3
    expect(Surd.term(Rational.ONE, 12n).toLatex()).toBe("2\\sqrt{3}");
    // √4 = 2 (becomes rational)
    expect(Surd.term(Rational.ONE, 4n).toRational().equals(rat(2))).toBe(true);
  });

  it("computes exact square roots of rationals", () => {
    // √(1/3) = √3 / 3
    expect(Surd.sqrtOfRational(rat(1, 3)).toLatex()).toBe("\\frac{\\sqrt{3}}{3}");
    approx(Surd.sqrtOfRational(rat(1, 3)), Math.sqrt(1 / 3));
    // √(2) stays √2
    approx(Surd.sqrtOfRational(rat(2)), Math.SQRT2);
  });

  it("adds like radicals and keeps unlike ones separate", () => {
    const a = Surd.term(rat(1), 2n).add(Surd.term(rat(3), 2n)); // √2 + 3√2 = 4√2
    expect(a.toLatex()).toBe("4\\sqrt{2}");
    const b = Surd.term(rat(1), 2n).add(Surd.term(rat(1), 3n)); // √2 + √3
    expect(b.size).toBe(2);
    approx(b, Math.SQRT2 + Math.sqrt(3));
  });

  it("multiplies, recombining radicals (√2·√3 = √6, √2·√2 = 2)", () => {
    expect(Surd.term(rat(1), 2n).mul(Surd.term(rat(1), 3n)).toLatex()).toBe("\\sqrt{6}");
    expect(
      Surd.term(rat(1), 2n).mul(Surd.term(rat(1), 2n)).toRational().equals(rat(2)),
    ).toBe(true);
  });

  it("divides by a single radical term and rationalizes", () => {
    // 1 / √2 = √2 / 2
    const r = Surd.fromInt(1).divBySingle(Surd.term(rat(1), 2n));
    expect(r.toLatex()).toBe("\\frac{\\sqrt{2}}{2}");
    approx(r, 1 / Math.SQRT2);
  });

  it("matches the canonical line-plane-angle answer 2√22/11", () => {
    // sinθ = |v·n| / (|v|·|n|) with v·n = 4, |v| = √6, |n| = √(11/3); √6·√(11/3) = √22
    const dot = Surd.fromInt(4);
    const normProduct = Surd.sqrtOfRational(rat(6)).mul(Surd.sqrtOfRational(rat(11, 3)));
    const sin = dot.abs().divBySingle(normProduct);
    expect(sin.toLatex()).toBe("\\frac{2\\sqrt{22}}{11}");
    approx(sin, (2 * Math.sqrt(22)) / 11);
  });

  it("rejects division by a multi-term surd and negative radicands", () => {
    const multi = Surd.term(rat(1), 2n).add(Surd.term(rat(1), 3n));
    expect(() => Surd.fromInt(1).divBySingle(multi)).toThrow();
    expect(() => Surd.sqrtOfRational(rat(-1))).toThrow();
  });
});

import { describe, it, expect } from "vitest";
import { Rational, rat } from "../src/exact/rational.js";

describe("Rational", () => {
  it("reduces on construction and normalizes sign to the numerator", () => {
    expect(rat(2, 4).toString()).toBe("1/2");
    expect(rat(-1, -2).toString()).toBe("1/2");
    expect(rat(1, -2).toString()).toBe("-1/2");
    expect(rat(6, 3).toString()).toBe("2");
  });

  it("adds, subtracts, multiplies and divides exactly", () => {
    expect(rat(1, 3).add(rat(1, 6)).equals(rat(1, 2))).toBe(true);
    expect(rat(7, 4).sub(rat(1, 4)).equals(rat(3, 2))).toBe(true);
    expect(rat(2, 3).mul(rat(3, 5)).equals(rat(2, 5))).toBe(true);
    expect(rat(2, 3).div(rat(4, 9)).equals(rat(3, 2))).toBe(true);
  });

  it("supports negative and integer powers", () => {
    expect(rat(2, 3).pow(3).equals(rat(8, 27))).toBe(true);
    expect(rat(2, 3).pow(-2).equals(rat(9, 4))).toBe(true);
    expect(rat(5).pow(0).equals(Rational.ONE)).toBe(true);
  });

  it("compares and reports sign", () => {
    expect(rat(1, 3).compare(rat(1, 2))).toBe(-1);
    expect(rat(1, 2).compare(rat(1, 2))).toBe(0);
    expect(rat(-3).sign()).toBe(-1);
    expect(Rational.ZERO.sign()).toBe(0);
  });

  it("throws on zero denominator and division by zero", () => {
    expect(() => rat(1, 0)).toThrow();
    expect(() => rat(1, 2).div(Rational.ZERO)).toThrow();
  });

  it("renders LaTeX with the sign outside the fraction", () => {
    expect(rat(3).toLatex()).toBe("3");
    expect(rat(2, 11).toLatex()).toBe("\\frac{2}{11}");
    expect(rat(-2, 11).toLatex()).toBe("-\\frac{2}{11}");
  });

  it("handles huge values without overflow (bigint backing)", () => {
    const big = rat(10n ** 30n, 3n).mul(rat(3n, 10n ** 30n));
    expect(big.equals(Rational.ONE)).toBe(true);
  });
});

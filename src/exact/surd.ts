/**
 * Exact real numbers living in the field generated over ℚ by square roots of
 * positive integers:
 *
 *     value = Σ qᵢ · √nᵢ        (nᵢ squarefree positive integers, qᵢ ∈ ℚ)
 *
 * The radicand `1` carries the purely rational part. This domain is closed under
 * `+`, `−`, `×` and — crucially for geometry — under division by a *single*
 * radical term `c·√a` (norms always reduce to that shape). That is exactly the
 * arithmetic the coordinate/vector method needs, so every answer the kernels
 * produce is exact, never a float.
 */

import { Rational, rat } from "./rational.js";

/** Reduce `n = k² · s` and return `{ outside: k, radicand: s }` with `s` squarefree. */
function reduceRadicand(n: bigint): { outside: bigint; radicand: bigint } {
  if (n < 0n) {
    throw new RangeError("reduceRadicand: negative radicand");
  }
  if (n === 0n) {
    return { outside: 0n, radicand: 1n };
  }
  let outside = 1n;
  let radicand = n;
  let d = 2n;
  while (d * d <= radicand) {
    const sq = d * d;
    while (radicand % sq === 0n) {
      radicand /= sq;
      outside *= d;
    }
    d += 1n;
  }
  return { outside, radicand };
}

/** Map from squarefree radicand → rational coefficient (only nonzero entries kept). */
type TermMap = Map<bigint, Rational>;

export class Surd {
  /** Invariant: keys are squarefree ≥ 1, values are nonzero, `1` = rational part. */
  private readonly terms: TermMap;

  private constructor(terms: TermMap) {
    this.terms = terms;
  }

  private static clean(terms: TermMap): Surd {
    const out: TermMap = new Map();
    for (const [k, v] of terms) {
      if (!v.isZero()) {
        out.set(k, v);
      }
    }
    return new Surd(out);
  }

  static readonly ZERO = new Surd(new Map());

  /** A purely rational value. */
  static fromRational(r: Rational): Surd {
    return Surd.clean(new Map([[1n, r]]));
  }

  static fromInt(n: bigint | number): Surd {
    return Surd.fromRational(rat(typeof n === "number" ? BigInt(n) : n));
  }

  /** `coeff · √radicand`, normalizing the radicand to squarefree form. */
  static term(coeff: Rational, radicand: bigint): Surd {
    if (radicand < 0n) {
      throw new RangeError("Surd.term: negative radicand");
    }
    if (radicand === 0n || coeff.isZero()) {
      return Surd.ZERO;
    }
    const { outside, radicand: s } = reduceRadicand(radicand);
    return Surd.clean(new Map([[s, coeff.mul(rat(outside))]]));
  }

  /** Exact square root of a non-negative rational `p/q` = `(1/q)·√(p·q)`. */
  static sqrtOfRational(r: Rational): Surd {
    if (r.sign() < 0) {
      throw new RangeError("Surd.sqrtOfRational: negative argument");
    }
    if (r.isZero()) {
      return Surd.ZERO;
    }
    const p = r.n;
    const q = r.d;
    return Surd.term(rat(1n, q), p * q);
  }

  isZero(): boolean {
    return this.terms.size === 0;
  }

  /** True when the value has no irrational part. */
  isRational(): boolean {
    for (const k of this.terms.keys()) {
      if (k !== 1n) {
        return false;
      }
    }
    return true;
  }

  /** The rational value, or throws if an irrational part is present. */
  toRational(): Rational {
    if (!this.isRational()) {
      throw new Error(`Surd.toRational: value is irrational (${this.toString()})`);
    }
    return this.terms.get(1n) ?? Rational.ZERO;
  }

  /** Number of nonzero radical terms. */
  get size(): number {
    return this.terms.size;
  }

  neg(): Surd {
    const out: TermMap = new Map();
    for (const [k, v] of this.terms) {
      out.set(k, v.neg());
    }
    return new Surd(out);
  }

  add(o: Surd): Surd {
    const out: TermMap = new Map(this.terms);
    for (const [k, v] of o.terms) {
      out.set(k, (out.get(k) ?? Rational.ZERO).add(v));
    }
    return Surd.clean(out);
  }

  sub(o: Surd): Surd {
    return this.add(o.neg());
  }

  scale(r: Rational): Surd {
    if (r.isZero()) {
      return Surd.ZERO;
    }
    const out: TermMap = new Map();
    for (const [k, v] of this.terms) {
      out.set(k, v.mul(r));
    }
    return new Surd(out);
  }

  mul(o: Surd): Surd {
    const out: TermMap = new Map();
    for (const [a, ca] of this.terms) {
      for (const [b, cb] of o.terms) {
        const { outside, radicand } = reduceRadicand(a * b);
        const coeff = ca.mul(cb).mul(rat(outside));
        out.set(radicand, (out.get(radicand) ?? Rational.ZERO).add(coeff));
      }
    }
    return Surd.clean(out);
  }

  /**
   * Divide by a single radical term `c·√a`. This is all the geometry kernels
   * ever need (denominators are products of vector norms). Dividing by a
   * multi-term surd is intentionally unsupported.
   */
  divBySingle(divisor: Surd): Surd {
    if (divisor.isZero()) {
      throw new RangeError("Surd.divBySingle: division by zero");
    }
    if (divisor.terms.size !== 1) {
      throw new Error("Surd.divBySingle: divisor must be a single radical term");
    }
    const entry = divisor.terms.entries().next().value as [bigint, Rational];
    const [a, c] = entry;
    // 1 / (c·√a) = (1/(c·a)) · √a  because √a·√a = a.
    const factor = Surd.term(Rational.ONE.div(c.mul(rat(a))), a);
    return this.mul(factor);
  }

  equals(o: Surd): boolean {
    return this.sub(o).isZero();
  }

  /** Floating-point value (display/ordering only). */
  toNumber(): number {
    let acc = 0;
    for (const [k, v] of this.terms) {
      acc += v.toNumber() * Math.sqrt(Number(k));
    }
    return acc;
  }

  /** |x| for a value of fixed sign (the kernels' answers are single-valued). */
  abs(): Surd {
    return this.toNumber() < 0 ? this.neg() : this;
  }

  private termsSorted(): Array<[bigint, Rational]> {
    return [...this.terms.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  }

  toString(): string {
    if (this.isZero()) {
      return "0";
    }
    return this.termsSorted()
      .map(([k, v]) => (k === 1n ? v.toString() : `${v.toString()}*sqrt(${k})`))
      .join(" + ");
  }

  /** LaTeX rendering of the full expression, with clean coefficient/sign handling. */
  toLatex(): string {
    if (this.isZero()) {
      return "0";
    }
    const parts: string[] = [];
    for (const [k, v] of this.termsSorted()) {
      const term = Surd.termLatex(v, k);
      if (parts.length === 0) {
        parts.push(term);
      } else if (term.startsWith("-")) {
        parts.push(`- ${term.slice(1)}`);
      } else {
        parts.push(`+ ${term}`);
      }
    }
    return parts.join(" ");
  }

  private static termLatex(coeff: Rational, radicand: bigint): string {
    if (radicand === 1n) {
      return coeff.toLatex();
    }
    const root = `\\sqrt{${radicand}}`;
    const sign = coeff.sign() < 0 ? "-" : "";
    const mag = coeff.abs();
    if (mag.isInteger()) {
      const m = mag.n;
      if (m === 1n) {
        return `${sign}${root}`;
      }
      return `${sign}${m}${root}`;
    }
    const num = mag.n === 1n ? root : `${mag.n}${root}`;
    return `${sign}\\frac{${num}}{${mag.d}}`;
  }
}

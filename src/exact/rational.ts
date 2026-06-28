/**
 * Exact rational numbers backed by `bigint`.
 *
 * Every value is stored fully reduced with a strictly positive denominator and
 * the sign carried by the numerator. All arithmetic is exact — there is no
 * floating point anywhere in this module except the explicit {@link Rational.toNumber}
 * escape hatch used only for display/ordering.
 */

function gcdBig(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

/** A reduced fraction `n / d` with `d > 0`. Immutable. */
export class Rational {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    this.n = n;
    this.d = d;
  }

  /** Construct from integers/bigints `num/den` (den defaults to 1), reducing. */
  static of(num: bigint | number, den: bigint | number = 1n): Rational {
    let n = typeof num === "number" ? Rational.intFromNumber(num) : num;
    let d = typeof den === "number" ? Rational.intFromNumber(den) : den;
    if (d === 0n) {
      throw new RangeError("Rational: division by zero denominator");
    }
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcdBig(n, d) || 1n;
    return new Rational(n / g, d / g);
  }

  private static intFromNumber(x: number): bigint {
    if (!Number.isInteger(x)) {
      throw new TypeError(`Rational: expected integer, got ${x}`);
    }
    return BigInt(x);
  }

  static readonly ZERO = Rational.of(0n);
  static readonly ONE = Rational.of(1n);

  isZero(): boolean {
    return this.n === 0n;
  }

  isInteger(): boolean {
    return this.d === 1n;
  }

  /** -1, 0, or 1. */
  sign(): -1 | 0 | 1 {
    return this.n === 0n ? 0 : this.n < 0n ? -1 : 1;
  }

  neg(): Rational {
    return new Rational(-this.n, this.d);
  }

  abs(): Rational {
    return this.n < 0n ? this.neg() : this;
  }

  add(o: Rational): Rational {
    return Rational.of(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o: Rational): Rational {
    return Rational.of(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o: Rational): Rational {
    return Rational.of(this.n * o.n, this.d * o.d);
  }

  div(o: Rational): Rational {
    if (o.isZero()) {
      throw new RangeError("Rational: division by zero");
    }
    return Rational.of(this.n * o.d, this.d * o.n);
  }

  /** Exact integer power (negative exponents invert). */
  pow(exp: number): Rational {
    if (!Number.isInteger(exp)) {
      throw new TypeError("Rational.pow: integer exponent required");
    }
    if (exp < 0) {
      return Rational.ONE.div(this.pow(-exp));
    }
    let acc = Rational.ONE;
    for (let i = 0; i < exp; i++) {
      acc = acc.mul(this);
    }
    return acc;
  }

  equals(o: Rational): boolean {
    return this.n === o.n && this.d === o.d;
  }

  /** -1 if this < o, 0 if equal, 1 if this > o. */
  compare(o: Rational): -1 | 0 | 1 {
    const lhs = this.n * o.d;
    const rhs = o.n * this.d;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }

  /**
   * LaTeX rendering. Integers render bare; non-integers as `\frac{n}{d}` with the
   * sign pulled outside the fraction.
   */
  toLatex(): string {
    if (this.d === 1n) {
      return `${this.n}`;
    }
    const sign = this.n < 0n ? "-" : "";
    const n = this.n < 0n ? -this.n : this.n;
    return `${sign}\\frac{${n}}{${this.d}}`;
  }
}

/** Convenience constructor: `rat(2, 11)` → 2/11. */
export function rat(num: bigint | number, den: bigint | number = 1n): Rational {
  return Rational.of(num, den);
}

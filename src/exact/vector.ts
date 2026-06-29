/**
 * Exact 3-D vectors over the {@link Surd} field. Used by the solid-geometry
 * kernel for the coordinate/vector method: dot, cross, norms, and angles are all
 * computed exactly, so the rendered lesson and its answer card can never drift
 * from the underlying mathematics.
 */

import { Rational, rat } from "./rational.js";
import { Surd } from "./surd.js";

type Scalar = Surd | Rational | bigint | number;

function toSurd(x: Scalar): Surd {
  if (x instanceof Surd) {
    return x;
  }
  if (x instanceof Rational) {
    return Surd.fromRational(x);
  }
  return Surd.fromInt(typeof x === "number" ? BigInt(x) : x);
}

export class Vec3 {
  readonly x: Surd;
  readonly y: Surd;
  readonly z: Surd;

  constructor(x: Scalar, y: Scalar, z: Scalar) {
    this.x = toSurd(x);
    this.y = toSurd(y);
    this.z = toSurd(z);
  }

  /** Build from plain rational/integer components. */
  static of(x: Scalar, y: Scalar, z: Scalar): Vec3 {
    return new Vec3(x, y, z);
  }

  add(o: Vec3): Vec3 {
    return new Vec3(this.x.add(o.x), this.y.add(o.y), this.z.add(o.z));
  }

  sub(o: Vec3): Vec3 {
    return new Vec3(this.x.sub(o.x), this.y.sub(o.y), this.z.sub(o.z));
  }

  scale(s: Scalar): Vec3 {
    const k = toSurd(s);
    return new Vec3(this.x.mul(k), this.y.mul(k), this.z.mul(k));
  }

  /** Midpoint of `this` and `o`. */
  midpoint(o: Vec3): Vec3 {
    return this.add(o).scale(rat(1, 2));
  }

  dot(o: Vec3): Surd {
    return this.x.mul(o.x).add(this.y.mul(o.y)).add(this.z.mul(o.z));
  }

  cross(o: Vec3): Vec3 {
    return new Vec3(
      this.y.mul(o.z).sub(this.z.mul(o.y)),
      this.z.mul(o.x).sub(this.x.mul(o.z)),
      this.x.mul(o.y).sub(this.y.mul(o.x)),
    );
  }

  /** ‖v‖² as an exact scalar (rational for the kernels' constructions). */
  normSquared(): Surd {
    return this.dot(this);
  }

  /** ‖v‖ as an exact surd. Requires ‖v‖² to be rational (always true here). */
  norm(): Surd {
    return Surd.sqrtOfRational(this.normSquared().toRational());
  }

  isZero(): boolean {
    return this.x.isZero() && this.y.isZero() && this.z.isZero();
  }

  toNumbers(): [number, number, number] {
    return [this.x.toNumber(), this.y.toNumber(), this.z.toNumber()];
  }

  toString(): string {
    return `(${this.x.toString()}, ${this.y.toString()}, ${this.z.toString()})`;
  }
}

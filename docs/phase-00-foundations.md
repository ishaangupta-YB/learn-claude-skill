# Phase 0 — Foundations

> Goal: a clean, reproducible TypeScript toolchain with strict typing, linting,
> and tests, plus project metadata. No product logic yet.

## Constraints

- **Language:** TypeScript on Node `>=20` (developed/tested on Node 22). No Python.
- **Strictness:** `tsc --strict` with `noUncheckedIndexedAccess` and
  `noImplicitOverride`. `@typescript-eslint/no-explicit-any` is an **error** —
  the codebase never uses `any`, `getattr`-style access, or unchecked casts.
- **Tests:** [Vitest](https://vitest.dev) v4 (zero known advisories in the
  dependency tree — verified with `npm audit`).
- **Module system:** ESM (`"type": "module"`), bundler-style resolution.
- **License:** MIT, © 2026 Ishaan Gupta. Owner: `ishaangupta-yb`.

## Deliverables

| File | Purpose |
|---|---|
| `package.json` | Metadata, scripts (`build`, `test`, `lint`, `typecheck`, `cli`), pinned dev deps |
| `tsconfig.json` | Strict compiler config, `src/ → dist/` |
| `vitest.config.ts` | Test + coverage config |
| `.eslintrc.cjs` | Lint rules (no `any`, unused-var guards) |
| `.gitignore` | Ignore `dist/`, `node_modules/`, secrets, generated `out/` |
| `LICENSE` | MIT |

## Variables / scripts

```
npm run build      # tsc → dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src + test
npm test           # vitest run
npm run cli -- ... # run the CLI from source via tsx
```

## Exit criteria

- `npm install` reports **0 vulnerabilities**.
- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` all succeed
  on the scaffold.

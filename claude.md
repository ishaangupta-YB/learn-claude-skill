# claude.md — Claude-compatible runtime guide

`learn-claude-skill` exposes its two skills under `.claude/skills/` so
Claude-compatible runtimes can use them. This file mirrors the binding rules in
[`agents.md`](./agents.md); read that first — it is authoritative.

## Models (Cloudflare Workers AI only)

This project uses **Cloudflare Workers AI models exclusively**. Even when run from
a Claude-compatible client, model calls must be routed to the
`cloudflare-workers-ai` provider defined in `opencode.json` (`@cf/...` ids). Do
not use Anthropic, OpenAI, or any other provider's models for generation here.

## Skills

- `.claude/skills/solid-geometry/SKILL.md`
- `.claude/skills/analytic-geometry/SKILL.md`

Both are copies of the OpenCode skills in `.opencode/skills/` and follow the same
extract → generate → deliver workflow driven by the `learn-skill` CLI.

## Non-negotiables

1. The exact kernel owns every number; you only parse problems and write prose.
2. Every lesson must pass `Orchestrator.selfCheck`.
3. Preserve LaTeX and interval bracket types exactly.
4. Never log or commit `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

## Quick reference

```sh
learn-skill spec spec.json --out lesson.html        # deterministic
learn-skill generate "<problem>" --out lesson.html  # uses Cloudflare Workers AI
learn-skill models                                  # list allowed @cf/ models
```

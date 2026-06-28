/**
 * learn-claude-skill — public API surface.
 *
 * An OpenCode-native skill suite that turns math problems into self-contained
 * interactive lesson web pages, powered exclusively by Cloudflare Workers AI
 * models. The deterministic exact-math core is the single source of truth for
 * every answer and coordinate; Cloudflare models are used only to parse input
 * and write narration.
 */

/** Semantic version of the toolkit (kept in sync with package.json). */
export const VERSION = "0.1.0";

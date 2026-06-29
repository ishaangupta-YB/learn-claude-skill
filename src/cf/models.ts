/**
 * The Cloudflare Workers AI model catalog this product is allowed to use.
 *
 * Hard rule for the whole codebase: **Cloudflare Workers AI models only.** Every
 * model id is a `@cf/...` slug served by Workers AI's OpenAI-compatible endpoint.
 * No other provider is referenced anywhere.
 */

/** Models verified against the Workers AI catalog (text generation). */
export const CF_MODELS = {
  /** Moonshot Kimi K2.7 — coding-tuned. Primary reasoning/orchestration model. */
  KIMI_K2_7_CODE: "@cf/moonshotai/kimi-k2.7-code",
  /** Moonshot Kimi K2.6 — general strong model. */
  KIMI_K2_6: "@cf/moonshotai/kimi-k2.6",
  /** Moonshot Kimi K2.5. */
  KIMI_K2_5: "@cf/moonshotai/kimi-k2.5",
  /** Qwen 2.5 Coder 32B — fast structured-output / code model. */
  QWEN_CODER_32B: "@cf/qwen/qwen2.5-coder-32b-instruct",
  /** Llama 3.3 70B fp8 fast — fallback general model. */
  LLAMA_33_70B: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  /** Llama 3.2 11B Vision — used for problems supplied as an image. */
  LLAMA_32_VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
} as const;

export type CloudflareModelId = (typeof CF_MODELS)[keyof typeof CF_MODELS] | (string & {});

/** Default model for spec extraction + narration (Kimi K2.7-code). */
export const DEFAULT_MODEL: CloudflareModelId = CF_MODELS.KIMI_K2_7_CODE;

/** Default model for image (vision) problem intake. */
export const DEFAULT_VISION_MODEL: CloudflareModelId = CF_MODELS.LLAMA_32_VISION;

/**
 * Guard enforcing the Cloudflare-only policy. Throws unless the id is a
 * Workers AI `@cf/...` slug.
 */
export function assertCloudflareModel(model: string): void {
  if (!model.startsWith("@cf/")) {
    throw new Error(
      `Refusing non-Cloudflare model "${model}". This product uses Cloudflare Workers AI models only (ids must start with "@cf/").`,
    );
  }
}

/** Hosts allowed to serve Workers AI traffic (direct API or AI Gateway). */
export const ALLOWED_HOSTS = ["api.cloudflare.com", "gateway.ai.cloudflare.com"] as const;

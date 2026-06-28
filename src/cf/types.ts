/**
 * Minimal OpenAI-compatible types for the Workers AI `/v1/chat/completions`
 * endpoint. Only the fields this product actually sends/reads are modelled — no
 * `any`, no loose index access.
 */

import type { CloudflareModelId } from "./models.js";

export type Role = "system" | "user" | "assistant";

/** A text content part. */
export interface TextPart {
  type: "text";
  text: string;
}

/** An image content part (used with the vision model for image problems). */
export interface ImagePart {
  type: "image_url";
  image_url: { url: string };
}

export type ContentPart = TextPart | ImagePart;

export interface ChatMessage {
  role: Role;
  /** Plain string, or multi-part content for multimodal (vision) requests. */
  content: string | ContentPart[];
}

export interface ChatOptions {
  model?: CloudflareModelId;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  /** Request a strict JSON object back (OpenAI-compatible). */
  jsonMode?: boolean;
  /** Per-call timeout in ms (overrides client default). */
  timeoutMs?: number;
  /** Abort signal to cancel the request. */
  signal?: AbortSignal;
}

export interface ChatChoiceMessage {
  role: Role;
  content: string | null;
}

export interface ChatChoice {
  index: number;
  message: ChatChoiceMessage;
  finish_reason: string | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: ChatChoice[];
  usage?: Usage;
}

/** Normalized result returned by the client. */
export interface ChatResult {
  text: string;
  model: string;
  usage?: Usage;
  raw: ChatCompletionResponse;
}

export interface CloudflareClientConfig {
  /** Cloudflare account id. */
  accountId: string;
  /** Workers AI API token (Bearer). */
  apiToken: string;
  /**
   * Override base URL. Defaults to the account's Workers AI OpenAI-compatible
   * endpoint. Must point at an allowed Cloudflare host.
   */
  baseURL?: string;
  /** Default model for requests that don't specify one. */
  model?: CloudflareModelId;
  /** Default request timeout in ms (default 60000). */
  timeoutMs?: number;
  /** Max retry attempts on 429/5xx/network errors (default 2). */
  maxRetries?: number;
  /** Base backoff delay in ms between retries (exponential). Default 300. */
  retryBaseDelayMs?: number;
  /** Injectable fetch (for testing / custom runtimes). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

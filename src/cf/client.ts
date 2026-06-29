/**
 * Cloudflare Workers AI client — the *only* model integration in this product.
 *
 * It talks to the Workers AI OpenAI-compatible endpoint
 * (`https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`) and refuses
 * any model id or host that is not Cloudflare. Used by the orchestrator to
 * extract problem specs, write step narration, and read image problems.
 */

import {
  ALLOWED_HOSTS,
  DEFAULT_MODEL,
  assertCloudflareModel,
  type CloudflareModelId,
} from "./models.js";
import type {
  ChatCompletionResponse,
  ChatMessage,
  ChatOptions,
  ChatResult,
  CloudflareClientConfig,
  ContentPart,
} from "./types.js";

/** Error raised for non-2xx responses or exhausted retries. */
export class CloudflareAIError extends Error {
  readonly status?: number;
  readonly body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "CloudflareAIError";
    this.status = status;
    this.body = body;
  }
}

function defaultBaseURL(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}

function assertAllowedHost(baseURL: string): void {
  let host: string;
  try {
    host = new URL(baseURL).host;
  } catch {
    throw new Error(`Invalid Cloudflare baseURL: ${baseURL}`);
  }
  if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new Error(
      `Refusing non-Cloudflare host "${host}". Allowed: ${ALLOWED_HOSTS.join(", ")}.`,
    );
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Return the first balanced `{...}`/`[...]` span in `text`, respecting strings. */
function balancedJSON(text: string): string | undefined {
  const start = text.search(/[[{]/);
  if (start < 0) {
    return undefined;
  }
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return undefined;
}

export class CloudflareWorkersAI {
  private readonly baseURL: string;
  private readonly apiToken: string;
  private readonly model: CloudflareModelId;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: CloudflareClientConfig) {
    if (!config.accountId) {
      throw new Error("CloudflareWorkersAI: accountId is required");
    }
    if (!config.apiToken) {
      throw new Error("CloudflareWorkersAI: apiToken is required");
    }
    this.baseURL = (config.baseURL ?? defaultBaseURL(config.accountId)).replace(/\/+$/, "");
    assertAllowedHost(this.baseURL);
    this.apiToken = config.apiToken;
    this.model = config.model ?? DEFAULT_MODEL;
    assertCloudflareModel(this.model);
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 300;
    const f = config.fetchImpl ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new Error("CloudflareWorkersAI: no fetch implementation available");
    }
    this.fetchImpl = f;
  }

  /** Build a multimodal user message pairing instruction text with an image URL. */
  static imageMessage(text: string, imageUrl: string): ChatMessage {
    const content: ContentPart[] = [
      { type: "text", text },
      { type: "image_url", image_url: { url: imageUrl } },
    ];
    return { role: "user", content };
  }

  /** Single chat completion. Retries transient failures with exponential backoff. */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model ?? this.model;
    assertCloudflareModel(model);

    const body: Record<string, unknown> = { model, messages };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
    if (options.top_p !== undefined) body.top_p = options.top_p;
    if (options.jsonMode) body.response_format = { type: "json_object" };

    const payload = JSON.stringify(body);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.send(payload, options);
        if (res.ok) {
          return this.parse(await res.text(), model);
        }
        const text = await res.text();
        if (this.retryable(res.status) && attempt < this.maxRetries) {
          await sleep(this.retryBaseDelayMs * 2 ** attempt);
          continue;
        }
        throw new CloudflareAIError(
          `Cloudflare Workers AI request failed (${res.status})`,
          res.status,
          text,
        );
      } catch (err) {
        lastError = err;
        if (err instanceof CloudflareAIError) {
          throw err;
        }
        if (attempt < this.maxRetries) {
          await sleep(this.retryBaseDelayMs * 2 ** attempt);
          continue;
        }
      }
    }
    throw new CloudflareAIError(
      `Cloudflare Workers AI request failed after ${this.maxRetries + 1} attempts: ${String(lastError)}`,
    );
  }

  /**
   * Chat completion whose reply is parsed as JSON of type `T`. Tolerates models
   * that wrap JSON in Markdown code fences.
   */
  async chatJSON<T>(messages: ChatMessage[], options: ChatOptions = {}): Promise<T> {
    const result = await this.chat(messages, { ...options, jsonMode: true });
    return CloudflareWorkersAI.extractJSON<T>(result.text);
  }

  /** Pull the first balanced JSON object/array out of a model reply and parse it. */
  static extractJSON<T>(text: string): T {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced?.[1] ?? text).trim();
    const slice = balancedJSON(candidate) ?? candidate;
    try {
      const parsed: unknown = JSON.parse(slice);
      return parsed as T;
    } catch {
      throw new CloudflareAIError(`Model did not return valid JSON: ${text.slice(0, 200)}`);
    }
  }

  private retryable(status: number): boolean {
    return status === 429 || (status >= 500 && status < 600);
  }

  private async send(payload: string, options: ChatOptions): Promise<Response> {
    const controller = new AbortController();
    const timeout = options.timeoutMs ?? this.timeoutMs;
    const timer = setTimeout(() => controller.abort(), timeout);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort);
    try {
      return await this.fetchImpl(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: payload,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  private parse(raw: string, requestedModel: string): ChatResult {
    let data: ChatCompletionResponse;
    try {
      data = JSON.parse(raw) as ChatCompletionResponse;
    } catch {
      throw new CloudflareAIError(`Malformed JSON response: ${raw.slice(0, 200)}`);
    }
    const choice = data.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string") {
      throw new CloudflareAIError("Response contained no message content");
    }
    const result: ChatResult = { text: content, model: data.model ?? requestedModel, raw: data };
    if (data.usage) {
      result.usage = data.usage;
    }
    return result;
  }
}

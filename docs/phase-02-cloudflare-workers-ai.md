# Phase 2 — Cloudflare Workers AI integration

> Goal: the single, policy-enforced model integration for the product. Cloudflare
> Workers AI only — no other provider exists in the codebase.

## Endpoint & auth

Workers AI exposes an **OpenAI-compatible** API:

```
POST {baseURL}/chat/completions
baseURL = https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1
Authorization: Bearer {CLOUDFLARE_API_TOKEN}
```

AI Gateway hosts (`gateway.ai.cloudflare.com`) are also accepted for caching /
observability. Any other host is rejected at construction time.

## Allowed models (`src/cf/models.ts`)

| Constant | Model id | Role |
|---|---|---|
| `KIMI_K2_7_CODE` | `@cf/moonshotai/kimi-k2.7-code` | **default** — spec extraction + narration |
| `KIMI_K2_6` | `@cf/moonshotai/kimi-k2.6` | strong general alternative |
| `KIMI_K2_5` | `@cf/moonshotai/kimi-k2.5` | alternative |
| `QWEN_CODER_32B` | `@cf/qwen/qwen2.5-coder-32b-instruct` | fast structured output |
| `LLAMA_33_70B` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | fallback |
| `LLAMA_32_VISION` | `@cf/meta/llama-3.2-11b-vision-instruct` | image problem intake |

`assertCloudflareModel()` throws on any id that does not start with `@cf/`, and is
called both in the constructor and on every `chat()` call.

## Client (`src/cf/client.ts`)

`CloudflareWorkersAI`:

- `chat(messages, options)` → `{ text, model, usage, raw }`.
- `chatJSON<T>(messages, options)` → strict JSON, tolerant of Markdown fences and
  trailing prose (balanced-span extraction).
- `static imageMessage(text, url)` → multimodal user message for vision intake.
- Per-request **timeout** via `AbortController`, caller `signal` honoured.
- **Retries** 429 / 5xx / network errors with exponential backoff; 4xx surfaced
  immediately as `CloudflareAIError` carrying `status` + `body`.
- **Injectable `fetch`** so the whole layer is unit-tested with zero network.

## Constraints

- No `any`; OpenAI-compatible request/response shapes are explicitly typed.
- Secrets (`apiToken`) are never logged.
- The client is the *only* place that performs model calls; kernels stay
  deterministic and model-free.

## Exit criteria

`cf-client` suite green: endpoint/auth/body shape, model + host policy, retry vs.
no-retry, JSON extraction, vision message construction.

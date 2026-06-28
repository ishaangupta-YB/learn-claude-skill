import { describe, it, expect, vi } from "vitest";
import { CloudflareWorkersAI, CloudflareAIError } from "../src/cf/client.js";
import { CF_MODELS, assertCloudflareModel } from "../src/cf/models.js";

interface Captured {
  url: string;
  init: RequestInit;
}

function jsonResponse(content: string, status = 200, model = CF_MODELS.KIMI_K2_7_CODE): Response {
  const body = JSON.stringify({
    id: "cmpl-1",
    model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
  });
  return new Response(status === 200 ? body : "error body", { status });
}

function client(fetchImpl: typeof fetch, extra: Record<string, unknown> = {}) {
  return new CloudflareWorkersAI({
    accountId: "acct123",
    apiToken: "tok_secret",
    fetchImpl,
    retryBaseDelayMs: 0,
    ...extra,
  });
}

describe("CloudflareWorkersAI", () => {
  it("posts to the Workers AI OpenAI-compatible endpoint with bearer auth", async () => {
    const captured: Captured[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      captured.push({ url: String(url), init: init ?? {} });
      return jsonResponse("hello");
    }) as unknown as typeof fetch;

    const cf = client(fetchImpl);
    const res = await cf.chat([{ role: "user", content: "hi" }]);

    expect(res.text).toBe("hello");
    expect(res.usage?.total_tokens).toBe(12);
    expect(captured[0]?.url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct123/ai/v1/chat/completions",
    );
    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok_secret");
    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.model).toBe(CF_MODELS.KIMI_K2_7_CODE);
    expect(body.messages[0]).toEqual({ role: "user", content: "hi" });
  });

  it("enforces the Cloudflare-only model policy", () => {
    expect(() => assertCloudflareModel("gpt-4o")).toThrow(/Cloudflare Workers AI models only/);
    expect(() => assertCloudflareModel("@cf/moonshotai/kimi-k2.6")).not.toThrow();
    const cf = client(vi.fn() as unknown as typeof fetch);
    expect(
      cf.chat([{ role: "user", content: "x" }], { model: "anthropic/claude" }),
    ).rejects.toThrow(/Cloudflare Workers AI models only/);
  });

  it("rejects non-Cloudflare hosts and missing credentials", () => {
    expect(
      () => new CloudflareWorkersAI({ accountId: "a", apiToken: "t", baseURL: "https://api.openai.com/v1" }),
    ).toThrow(/non-Cloudflare host/);
    expect(() => new CloudflareWorkersAI({ accountId: "", apiToken: "t" })).toThrow(/accountId/);
    expect(() => new CloudflareWorkersAI({ accountId: "a", apiToken: "" })).toThrow(/apiToken/);
  });

  it("allows AI Gateway hosts", () => {
    expect(
      () =>
        new CloudflareWorkersAI({
          accountId: "a",
          apiToken: "t",
          baseURL: "https://gateway.ai.cloudflare.com/v1/a/g/workers-ai/v1",
        }),
    ).not.toThrow();
  });

  it("retries on 429 then succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      return calls === 1 ? jsonResponse("", 429) : jsonResponse("recovered");
    }) as unknown as typeof fetch;
    const cf = client(fetchImpl);
    const res = await cf.chat([{ role: "user", content: "x" }]);
    expect(calls).toBe(2);
    expect(res.text).toBe("recovered");
  });

  it("does not retry on 4xx and surfaces status", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      return jsonResponse("", 400);
    }) as unknown as typeof fetch;
    const cf = client(fetchImpl);
    await expect(cf.chat([{ role: "user", content: "x" }])).rejects.toMatchObject({
      name: "CloudflareAIError",
      status: 400,
    });
    expect(calls).toBe(1);
  });

  it("parses JSON replies, tolerating Markdown code fences", async () => {
    const fenced = "```json\n{\"type\":\"cube\",\"edge\":2}\n```";
    const fetchImpl = vi.fn(async () => jsonResponse(fenced)) as unknown as typeof fetch;
    const cf = client(fetchImpl);
    const obj = await cf.chatJSON<{ type: string; edge: number }>([
      { role: "user", content: "extract" },
    ]);
    expect(obj).toEqual({ type: "cube", edge: 2 });

    expect(CloudflareWorkersAI.extractJSON<{ a: number }>("noise {\"a\":1} trailing")).toEqual({
      a: 1,
    });
    expect(() => CloudflareWorkersAI.extractJSON("not json")).toThrow(CloudflareAIError);
  });

  it("builds multimodal image messages for vision intake", () => {
    const msg = CloudflareWorkersAI.imageMessage("Read this problem", "data:image/png;base64,AAA");
    expect(msg.role).toBe("user");
    expect(Array.isArray(msg.content)).toBe(true);
    const parts = msg.content as Array<{ type: string }>;
    expect(parts.map((p) => p.type)).toEqual(["text", "image_url"]);
  });
});

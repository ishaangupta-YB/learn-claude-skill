import { describe, it, expect, vi } from "vitest";
import { CloudflareWorkersAI } from "../src/cf/client.js";
import { CF_MODELS } from "../src/cf/models.js";
import { Orchestrator, type ProblemSpec } from "../src/orchestrator.js";

function clientReturning(content: string): CloudflareWorkersAI {
  const fetchImpl = vi.fn(async () =>
    new Response(
      JSON.stringify({
        id: "x",
        model: CF_MODELS.KIMI_K2_7_CODE,
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      }),
      { status: 200 },
    ),
  ) as unknown as typeof fetch;
  return new CloudflareWorkersAI({ accountId: "a", apiToken: "t", fetchImpl, retryBaseDelayMs: 0 });
}

describe("Orchestrator", () => {
  it("renders a solid spec deterministically and self-checks", async () => {
    const orch = new Orchestrator();
    const problem: ProblemSpec = {
      domain: "solid",
      spec: {
        body: { type: "cube", edge: 1 },
        query: { type: "line_plane_angle", line: ["A", "C1"], plane: ["A", "B", "C"] },
      },
    };
    const { lesson, html } = await orch.renderSpec(problem);
    expect(lesson.answerLatex).toContain("\\frac{\\sqrt{3}}{3}");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("runs the full pipeline: model spec → kernel → html", async () => {
    const spec = JSON.stringify({
      domain: "solid",
      spec: {
        body: { type: "cube", edge: 1 },
        query: { type: "line_line_angle", line1: ["A", "B1"], line2: ["B", "C1"] },
      },
    });
    const orch = new Orchestrator(clientReturning(spec));
    const { lesson } = await orch.generate({ text: "angle between AB1 and BC1 in a unit cube" });
    expect(lesson.answerValue).toBeCloseTo(0.5, 12);
  });

  it("handles analytic specs from the model", async () => {
    const spec = JSON.stringify({ domain: "analytic", spec: { kind: "parabola_focal_chord_dot", p: 2 } });
    const orch = new Orchestrator(clientReturning(spec));
    const { lesson } = await orch.generate({ text: "focal chord dot product" });
    expect(lesson.answerValue).toBeCloseTo(-3, 12);
  });

  it("rejects an invalid spec from the model", async () => {
    const orch = new Orchestrator(clientReturning(JSON.stringify({ domain: "nonsense" })));
    await expect(orch.generate({ text: "junk" })).rejects.toThrow(/Unknown domain/);
  });

  it("selfCheck throws when the lesson answer is tampered", () => {
    const problem: ProblemSpec = {
      domain: "analytic",
      spec: { kind: "ellipse_slope_product", a2: 4, b2: 3 },
    };
    const orch = new Orchestrator();
    const lesson = orch.lessonFromSpec(problem);
    expect(() => Orchestrator.selfCheck(problem, { ...lesson, answerValue: 999 })).toThrow(
      /Self-check failed/,
    );
  });

  it("requires a client for natural-language generation", async () => {
    const orch = new Orchestrator();
    await expect(orch.generate({ text: "anything" })).rejects.toThrow(/requires a Cloudflare/);
  });
});

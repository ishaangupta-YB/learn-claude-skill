/**
 * The orchestrator ties the pieces together:
 *
 *   problem (text or image)
 *     → Cloudflare model extracts a structured spec (JSON)
 *     → exact kernel computes the lesson (single source of truth)
 *     → Cloudflare model optionally rewrites step prose
 *     → self-check (kernel answer must equal the lesson's answer)
 *     → render to interactive HTML
 *
 * The model never decides the mathematics: it only parses the problem and writes
 * narration. If no model client is supplied, specs can still be solved and
 * rendered deterministically (used by tests and offline runs).
 */

import { CloudflareWorkersAI } from "./cf/client.js";
import { DEFAULT_VISION_MODEL } from "./cf/models.js";
import type { ChatMessage } from "./cf/types.js";
import { buildAnalyticLesson, solveAnalytic, type AnalyticSpec } from "./analytic/analytic.js";
import { buildSolidLesson, solveSolid, type SolidSpec } from "./geometry/solid.js";
import type { Lesson } from "./lesson/types.js";
import { renderLesson, type RenderOptions } from "./render/render.js";

export type Domain = "solid" | "analytic";

export type ProblemSpec =
  | { domain: "solid"; spec: SolidSpec }
  | { domain: "analytic"; spec: AnalyticSpec };

export const SPEC_SYSTEM_PROMPT = `You convert a math problem into a strict JSON spec for an exact geometry engine.
Output ONLY a JSON object, no prose, no code fences.

For 3-D solid geometry:
{ "domain":"solid", "spec":{
  "body": one of
    {"type":"cube","edge":<int>} |
    {"type":"cuboid","a":<int>,"b":<int>,"c":<int>} |
    {"type":"regular_quad_pyramid","side":<int>,"height":<int>} |
    {"type":"regular_tetrahedron","edge":<int>},
  "query": one of
    {"type":"line_plane_angle","line":["A","C1"],"plane":["A","B","C"]} |
    {"type":"line_line_angle","line1":["A","B1"],"line2":["B","C1"]} |
    {"type":"dihedral","plane1":["A","B","C"],"plane2":["A","B","B1"]} |
    {"type":"distance_point_plane","point":"A1","plane":["A","B","C"]} |
    {"type":"volume"}
}}
Vertices: box/cube use A,B,C,D (bottom) and A1,B1,C1,D1 (top). Pyramid uses A,B,C,D (base) and P (apex). Tetrahedron uses A,B,C,D.

For 2-D analytic geometry:
{ "domain":"analytic", "spec": one of
  {"kind":"ellipse_focal_dot","a2":<int>,"b2":<int>,"excludeMajorVertices":<bool>} |
  {"kind":"ellipse_slope_product","a2":<int>,"b2":<int>} |
  {"kind":"parabola_focal_chord_dot","p":<int>}
}
a2 and b2 are the SQUARED semi-axes (a2 > b2).`;

export interface GenerateResult {
  spec: ProblemSpec;
  lesson: Lesson;
  html: string;
}

export interface OrchestratorOptions {
  render?: RenderOptions;
  /** Rewrite step prose with the model (answer math is always kept exact). */
  narrate?: boolean;
}

export class Orchestrator {
  constructor(
    private readonly client?: CloudflareWorkersAI,
    private readonly options: OrchestratorOptions = {},
  ) {}

  /** Build a lesson directly from a validated spec — fully deterministic. */
  lessonFromSpec(problem: ProblemSpec): Lesson {
    return problem.domain === "solid"
      ? buildSolidLesson(problem.spec)
      : buildAnalyticLesson(problem.spec);
  }

  /** Self-check: re-run the kernel from the spec and confirm answers match. */
  static selfCheck(problem: ProblemSpec, lesson: Lesson): void {
    const value =
      problem.domain === "solid"
        ? solveSolid(problem.spec).answerValue
        : solveAnalytic(problem.spec).answerValue;
    if (!Number.isFinite(value) || Math.abs(value - lesson.answerValue) > 1e-9) {
      throw new Error(
        `Self-check failed: kernel=${value} vs lesson=${lesson.answerValue}`,
      );
    }
  }

  /** Render a spec to HTML deterministically (no model needed). */
  async renderSpec(problem: ProblemSpec): Promise<GenerateResult> {
    const lesson = this.lessonFromSpec(problem);
    Orchestrator.selfCheck(problem, lesson);
    const html = await renderLesson(lesson, this.options.render);
    return { spec: problem, lesson, html };
  }

  /** Full pipeline from a natural-language (and optionally image) problem. */
  async generate(input: { text: string; imageUrl?: string }): Promise<GenerateResult> {
    if (!this.client) {
      throw new Error("Orchestrator.generate requires a Cloudflare Workers AI client");
    }
    const userContent = input.imageUrl
      ? CloudflareWorkersAI.imageMessage(input.text, input.imageUrl)
      : { role: "user" as const, content: input.text };
    const messages: ChatMessage[] = [
      { role: "system", content: SPEC_SYSTEM_PROMPT },
      userContent,
    ];
    const options = input.imageUrl ? { model: DEFAULT_VISION_MODEL } : {};
    const problem = await this.client.chatJSON<ProblemSpec>(messages, options);
    validateProblemSpec(problem);

    let lesson = this.lessonFromSpec(problem);
    Orchestrator.selfCheck(problem, lesson);

    if (this.options.narrate) {
      lesson = await this.narrate(lesson);
      Orchestrator.selfCheck(problem, lesson);
    }

    const html = await renderLesson(lesson, this.options.render);
    return { spec: problem, lesson, html };
  }

  /**
   * Ask the model to improve the prose of the problem and steps. The exact
   * answer (`answerLatex`/`answerValue`) is never sent for rewriting and is
   * re-asserted in the final step, so narration cannot corrupt the math.
   */
  private async narrate(lesson: Lesson): Promise<Lesson> {
    if (!this.client) {
      return lesson;
    }
    const prompt = [
      {
        role: "system" as const,
        content:
          "Rewrite the problem statement and each step explanation to be clearer for a student. Keep all LaTeX ($...$) intact. Do NOT change any numbers or the final answer. Output JSON {\"problemHtml\":string,\"steps\":[{\"title\":string,\"html\":string}]} with the same number of steps.",
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          problemHtml: lesson.problemHtml,
          steps: lesson.steps.map((s) => ({ title: s.title, html: s.html })),
        }),
      },
    ];
    try {
      const out = await this.client.chatJSON<{
        problemHtml: string;
        steps: Array<{ title: string; html: string }>;
      }>(prompt);
      if (!Array.isArray(out.steps) || out.steps.length !== lesson.steps.length) {
        return lesson;
      }
      const steps = lesson.steps.map((orig, i) => ({
        title: out.steps[i]?.title ?? orig.title,
        html: out.steps[i]?.html ?? orig.html,
        ...(orig.highlight ? { highlight: orig.highlight } : {}),
      }));
      // Re-assert the exact answer in the last step (defensive).
      const last = steps[steps.length - 1];
      if (last && !last.html.includes(lesson.answerLatex)) {
        last.html += ` <span class="exact-answer">$${lesson.answerLatex}$</span>`;
      }
      return { ...lesson, problemHtml: out.problemHtml || lesson.problemHtml, steps };
    } catch {
      return lesson;
    }
  }
}

function validateProblemSpec(p: ProblemSpec): void {
  if (p.domain === "solid") {
    if (!p.spec?.body?.type || !p.spec?.query?.type) {
      throw new Error("Invalid solid spec from model");
    }
  } else if (p.domain === "analytic") {
    if (!p.spec?.kind) {
      throw new Error("Invalid analytic spec from model");
    }
  } else {
    throw new Error(`Unknown domain in model spec: ${JSON.stringify(p)}`);
  }
}

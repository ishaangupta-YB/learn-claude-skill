import { describe, it, expect } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSolidLesson } from "../src/geometry/solid.js";
import { buildAnalyticLesson } from "../src/analytic/analytic.js";
import { renderLesson, writeLesson } from "../src/render/render.js";

describe("render", () => {
  it("injects the lesson data and leaves no placeholder", async () => {
    const lesson = buildSolidLesson({
      body: { type: "cube", edge: 1 },
      query: { type: "line_plane_angle", line: ["A", "C1"], plane: ["A", "B", "C"] },
    });
    const html = await renderLesson(lesson);
    expect(html).not.toContain("__LESSON_DATA__");
    expect(html).toContain("three.module.js");
    expect(html).toContain(lesson.title);
    // angle brackets in the data island are escaped
    expect(html).toContain("\\u003c");
  });

  it("renders the analytic template too", async () => {
    const lesson = buildAnalyticLesson({ kind: "ellipse_focal_dot", a2: 4, b2: 1 });
    const html = await renderLesson(lesson);
    expect(html).not.toContain("__LESSON_DATA__");
    expect(html).toContain("board");
  });

  it("writes a lesson to disk", async () => {
    const lesson = buildSolidLesson({
      body: { type: "cuboid", a: 2, b: 3, c: 4 },
      query: { type: "volume" },
    });
    const out = join(tmpdir(), `lesson-${Date.now()}.html`);
    await writeLesson(lesson, out);
    const written = await readFile(out, "utf8");
    expect(written).toContain("<!DOCTYPE html>");
    await rm(out, { force: true });
  });
});

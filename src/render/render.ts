/**
 * Renders a {@link Lesson} into a self-contained interactive HTML file by
 * injecting the lesson JSON into the matching template's `__LESSON_DATA__`
 * placeholder. The template's front-end (Three.js / Canvas + KaTeX) reads the
 * data island and draws the scene — no server required.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Lesson } from "../lesson/types.js";

const PLACEHOLDER = "__LESSON_DATA__";

function defaultTemplatesDir(): string {
  // dist/render/render.js → packageRoot/templates
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "templates");
}

/** HTML-safe JSON: prevents the data island from breaking out of the script tag. */
function safeJSON(lesson: Lesson): string {
  return JSON.stringify(lesson)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export interface RenderOptions {
  /** Directory holding `solid.html` / `analytic.html`. Defaults to the package's. */
  templatesDir?: string;
}

export function templateFor(kind: Lesson["kind"]): string {
  return kind === "solid" ? "solid.html" : "analytic.html";
}

/** Render a lesson to a complete HTML document string. */
export async function renderLesson(lesson: Lesson, options: RenderOptions = {}): Promise<string> {
  const dir = options.templatesDir ?? defaultTemplatesDir();
  const template = await readFile(join(dir, templateFor(lesson.kind)), "utf8");
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`Template ${templateFor(lesson.kind)} is missing ${PLACEHOLDER}`);
  }
  return template.replace(PLACEHOLDER, safeJSON(lesson));
}

/** Render a lesson and write it to `outPath`. Returns the HTML written. */
export async function writeLesson(
  lesson: Lesson,
  outPath: string,
  options: RenderOptions = {},
): Promise<string> {
  const html = await renderLesson(lesson, options);
  await writeFile(outPath, html, "utf8");
  return html;
}

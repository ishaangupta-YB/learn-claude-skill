#!/usr/bin/env node
/**
 * `learn-skill` CLI — generate an interactive geometry lesson as a standalone
 * HTML file.
 *
 * Commands:
 *   learn-skill spec <file.json> [--out lesson.html]
 *       Render a validated problem spec deterministically (no model needed).
 *   learn-skill generate "<problem text>" [--image <url>] [--narrate] [--out lesson.html]
 *       Full pipeline. Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
 *   learn-skill models
 *       List the allowed Cloudflare Workers AI models.
 */

import { readFile, writeFile } from "node:fs/promises";
import { CloudflareWorkersAI } from "./cf/client.js";
import { CF_MODELS, type CloudflareModelId } from "./cf/models.js";
import { Orchestrator, type ProblemSpec } from "./orchestrator.js";

interface Flags {
  out: string;
  image?: string;
  narrate: boolean;
  model?: CloudflareModelId;
  positional: string[];
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = { out: "lesson.html", narrate: false, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") flags.out = argv[++i] ?? flags.out;
    else if (a === "--image") flags.image = argv[++i];
    else if (a === "--model") flags.model = argv[++i] as CloudflareModelId;
    else if (a === "--narrate") flags.narrate = true;
    else if (a) flags.positional.push(a);
  }
  return flags;
}

function makeClient(model?: CloudflareModelId): CloudflareWorkersAI {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to use `generate`.",
    );
  }
  return new CloudflareWorkersAI({ accountId, apiToken, ...(model ? { model } : {}) });
}

function usage(): void {
  process.stdout.write(
    [
      "learn-skill — interactive geometry lessons (Cloudflare Workers AI only)",
      "",
      "  learn-skill spec <file.json> [--out lesson.html]",
      "  learn-skill generate \"<problem>\" [--image <url>] [--narrate] [--model <@cf/...>] [--out lesson.html]",
      "  learn-skill models",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseArgs(rest);

  if (!command || command === "help" || command === "--help") {
    usage();
    return 0;
  }

  if (command === "models") {
    for (const [key, id] of Object.entries(CF_MODELS)) {
      process.stdout.write(`${id}  (${key})\n`);
    }
    return 0;
  }

  if (command === "spec") {
    const file = flags.positional[0];
    if (!file) {
      process.stderr.write("error: spec requires a JSON file path\n");
      return 1;
    }
    const problem = JSON.parse(await readFile(file, "utf8")) as ProblemSpec;
    const orch = new Orchestrator();
    const { lesson, html } = await orch.renderSpec(problem);
    await writeFile(flags.out, html, "utf8");
    process.stdout.write(`Wrote ${flags.out}\nAnswer: ${lesson.answerLatex}\n`);
    return 0;
  }

  if (command === "generate") {
    const text = flags.positional.join(" ");
    if (!text) {
      process.stderr.write("error: generate requires a problem statement\n");
      return 1;
    }
    const client = makeClient(flags.model);
    const orch = new Orchestrator(client, { narrate: flags.narrate });
    const { lesson, html } = await orch.generate({
      text,
      ...(flags.image ? { imageUrl: flags.image } : {}),
    });
    await writeFile(flags.out, html, "utf8");
    process.stdout.write(`Wrote ${flags.out}\nAnswer: ${lesson.answerLatex}\n`);
    return 0;
  }

  process.stderr.write(`error: unknown command "${command}"\n`);
  usage();
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });

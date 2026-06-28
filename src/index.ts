export const VERSION = "0.1.0";

export * from "./exact/index.js";
export * from "./cf/index.js";
export * from "./geometry/index.js";
export * from "./analytic/index.js";
export * from "./render/index.js";
export * from "./lesson/types.js";
export {
  Orchestrator,
  SPEC_SYSTEM_PROMPT,
  type Domain,
  type ProblemSpec,
  type GenerateResult,
  type OrchestratorOptions,
} from "./orchestrator.js";

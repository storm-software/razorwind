/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { AgentId, AgentUsage } from "../types";
import { claudeCodeAdapter } from "./claude-code";
import { codexAdapter } from "./codex";
import type { ProcessRunner } from "./process";

export interface AgentRunRequest {
  model: string;
  prompt: string;
  fixturePath: string;
  timeoutMs: number;
  env?: Record<string, string | undefined>;
}

export interface AgentRunResult {
  ok: boolean;
  timedOut: boolean;
  exitCode: number | null;
  durationMs: number;
  transcript: string;
  resultText?: string;
  usage?: AgentUsage;
}

export interface AgentDetection {
  ok: boolean;
  version?: string;
  error?: string;
}

export interface AgentAdapter {
  id: AgentId;
  defaultModel: string;
  detect: (runner?: ProcessRunner) => Promise<AgentDetection>;
  run: (
    request: AgentRunRequest,
    runner?: ProcessRunner
  ) => Promise<AgentRunResult>;
}

const ADAPTERS: Record<AgentId, AgentAdapter> = {
  "claude-code": claudeCodeAdapter,
  codex: codexAdapter
};

export function getAgentAdapter(id: AgentId): AgentAdapter {
  return ADAPTERS[id];
}

export { claudeCodeAdapter } from "./claude-code";
export { codexAdapter } from "./codex";
export { runProcess } from "./process";
export type {
  ProcessRequest,
  ProcessResult,
  ProcessRunner,
  SpawnProcess
} from "./process";

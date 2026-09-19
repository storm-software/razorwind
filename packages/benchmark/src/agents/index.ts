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
  detect(runner?: ProcessRunner): Promise<AgentDetection>;
  run(
    request: AgentRunRequest,
    runner?: ProcessRunner
  ): Promise<AgentRunResult>;
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

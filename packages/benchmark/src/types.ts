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

export type AgentId = "claude-code" | "codex";
export type ContextLevel = "bare" | "agents-md" | "skill";
export type Gate = "pass" | "review" | "fail";
export type DimensionName =
  | "imports"
  | "apiFidelity"
  | "tokenDiscipline"
  | "a11yStatic"
  | "compile"
  | "judgment";

export interface BenchmarkRubric {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
}

export interface MechanicalOverrides {
  allowHexIn?: string[];
  extraAllowedImports?: string[];
}

export interface BenchmarkTask {
  id: string;
  title: string;
  prompt: string;
  hiddenExpectations?: string[];
  rubrics: BenchmarkRubric[];
  mechanicalOverrides?: MechanicalOverrides;
}

export interface BenchmarkProfile {
  agents?: AgentId[];
  models?: Partial<Record<AgentId, string[]>>;
  contexts?: ContextLevel[];
  tasks?: string[] | "*";
  repetitions?: number;
}

export interface JudgeOptions {
  agent: AgentId;
  model: string;
  samples?: number;
  timeoutMs?: number;
}

export interface BenchmarkOptions {
  profile?: "smoke" | "small" | "medium" | "full" | BenchmarkProfile;
  agents?: AgentId[];
  models?: Partial<Record<AgentId, string[]>>;
  contexts?: ContextLevel[];
  context?: { agentsMd?: string[]; skillDirs?: string[] };
  tasks?: "bundled" | BenchmarkTask[];
  packageName?: string;
  outputPath?: string;
  repetitions?: number;
  concurrency?: number;
  timeoutMs?: number;
  retainWorkspaces?: boolean;
  judge?: JudgeOptions;
}

export interface ResolvedBenchmarkOptions {
  profile: NonNullable<BenchmarkOptions["profile"]>;
  agents: AgentId[];
  models: Partial<Record<AgentId, string[]>>;
  contexts: ContextLevel[];
  context: { agentsMd: string[]; skillDirs: string[] };
  tasks: "bundled" | BenchmarkTask[];
  packageName?: string;
  outputPath: string;
  repetitions: number;
  concurrency: number;
  timeoutMs: number;
  retainWorkspaces: boolean;
  judge?: Required<JudgeOptions>;
  cwd: string;
}

export interface ComponentProp {
  required: boolean;
  type: string;
}

export type ComponentPropMap = Record<string, ComponentProp>;

export interface BenchmarkComponent {
  name: string;
  exportName: string;
  description?: string;
  props: ComponentPropMap | null;
}

export interface BenchmarkToken {
  path: string;
  type?: string;
  value: unknown;
  theme?: string;
}

export interface GroundTruth {
  packageName: string;
  components: Record<string, BenchmarkComponent>;
  tokens: BenchmarkToken[];
}

export interface CellSpec {
  id: string;
  agent: AgentId;
  model: string;
  context: ContextLevel;
  taskId: string;
  repetition: number;
}

export interface Finding {
  dimension: DimensionName;
  message: string;
  file?: string;
  fix?: string;
}

export interface DimensionResult {
  dimension: DimensionName;
  score: number;
  gate: Gate;
  findings: Finding[];
  applicable?: boolean;
}

export interface AgentUsage {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  turns?: number;
}

export interface CellResult {
  cell: CellSpec;
  dimensions: DimensionResult[];
  score: number;
  gate: Gate;
  durationMs: number;
  transcript?: string;
  usage?: AgentUsage;
  error?: { kind: "agent" | "judge" | "timeout" | "fixture"; message: string };
  workspacePath?: string;
}

export interface BenchmarkRun {
  schemaVersion: 1;
  startedAt: string;
  completedAt: string;
  packageName: string;
  profile: string;
  cells: CellResult[];
}

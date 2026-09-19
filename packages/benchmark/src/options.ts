import { isAbsolute, normalize, resolve, win32 } from "node:path";
import type {
  BenchmarkOptions,
  JudgeOptions,
  ResolvedBenchmarkOptions
} from "./types";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export function assertSafeRelativePath(path: string, label: string): string {
  const portable = path.replaceAll("\\", "/");
  const normalized = normalize(portable).replaceAll("\\", "/");

  if (
    !portable.trim() ||
    portable === "." ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    isAbsolute(portable) ||
    win32.isAbsolute(portable)
  ) {
    throw new Error(`${label} must be a relative path inside the output root`);
  }

  return normalized.replace(/^\.\//, "");
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  label: string
) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return resolved;
}

function resolveJudge(
  judge: JudgeOptions | undefined
): Required<JudgeOptions> | undefined {
  if (!judge) return undefined;
  if (!judge.model.trim()) throw new Error("judge.model must not be empty");
  return {
    ...judge,
    samples: positiveInteger(judge.samples, 1, "judge.samples"),
    timeoutMs: positiveInteger(judge.timeoutMs, 120_000, "judge.timeoutMs")
  };
}

export function resolveBenchmarkOptions(
  options: BenchmarkOptions = {},
  cwd = process.cwd()
): ResolvedBenchmarkOptions {
  return {
    profile: options.profile ?? "smoke",
    agents: [...(options.agents ?? [])],
    models: { ...options.models },
    contexts: [...(options.contexts ?? ["bare", "agents-md"])],
    context: {
      agentsMd: [...(options.context?.agentsMd ?? [])],
      skillDirs: [...(options.context?.skillDirs ?? [])]
    },
    tasks: options.tasks ?? "bundled",
    packageName: options.packageName,
    outputPath: assertSafeRelativePath(
      options.outputPath ?? "benchmark",
      "outputPath"
    ),
    repetitions: positiveInteger(options.repetitions, 1, "repetitions"),
    concurrency: positiveInteger(options.concurrency, 1, "concurrency"),
    timeoutMs: positiveInteger(
      options.timeoutMs,
      DEFAULT_TIMEOUT_MS,
      "timeoutMs"
    ),
    retainWorkspaces: options.retainWorkspaces ?? false,
    judge: resolveJudge(options.judge),
    cwd: resolve(cwd)
  };
}

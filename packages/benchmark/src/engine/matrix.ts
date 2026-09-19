import type {
  BenchmarkProfile,
  BenchmarkTask,
  CellSpec,
  ResolvedBenchmarkOptions
} from "../types";

export const BUILT_IN_PROFILES: Record<
  "smoke" | "small" | "medium" | "full",
  BenchmarkProfile
> = {
  smoke: {
    contexts: ["bare", "agents-md"],
    tasks: ["confirm-account-deletion"],
    repetitions: 1
  },
  small: {
    contexts: ["skill"],
    tasks: [
      "confirm-account-deletion",
      "success-feedback",
      "settings-toggle-section",
      "cancel-plan-action-hierarchy",
      "connection-status-indicator"
    ],
    repetitions: 1
  },
  medium: {
    contexts: ["agents-md", "skill"],
    tasks: "*",
    repetitions: 1
  },
  full: {
    contexts: ["bare", "agents-md", "skill"],
    tasks: "*",
    repetitions: 3
  }
};

function profileFor(options: ResolvedBenchmarkOptions): BenchmarkProfile {
  return typeof options.profile === "string"
    ? BUILT_IN_PROFILES[options.profile]
    : options.profile;
}

export function expandMatrix(
  options: ResolvedBenchmarkOptions,
  tasks: BenchmarkTask[]
): CellSpec[] {
  const profile = profileFor(options);
  const agents = [...(profile.agents ?? options.agents)].sort();
  const models = profile.models ?? options.models;
  const contexts = [...(profile.contexts ?? options.contexts)].sort();
  const repetitions = profile.repetitions ?? options.repetitions;
  const selectedIds =
    profile.tasks === "*" ? undefined : new Set(profile.tasks);
  const selectedTasks = tasks
    .filter(task => !selectedIds || selectedIds.has(task.id))
    .sort((left, right) => left.id.localeCompare(right.id));

  const cells: CellSpec[] = [];
  for (const agent of agents) {
    for (const model of [...(models[agent] ?? ["default"])].sort()) {
      for (const context of contexts) {
        for (const task of selectedTasks) {
          for (let repetition = 1; repetition <= repetitions; repetition++) {
            cells.push({
              id: [agent, model, context, task.id, repetition].join("|"),
              agent,
              model,
              context,
              taskId: task.id,
              repetition
            });
          }
        }
      }
    }
  }

  if (cells.length === 0) {
    throw new Error("benchmark profile resolved to zero evaluation cells");
  }
  return cells;
}

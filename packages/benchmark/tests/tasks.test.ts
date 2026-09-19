import { describe, expect, it } from "vitest";
import { BUNDLED_TASKS, loadTasks, validateTask } from "../src/tasks";
import type { BenchmarkTask } from "../src/types";

const validTask: BenchmarkTask = {
  id: "valid",
  title: "Valid",
  prompt: "Create a clear action area.",
  hiddenExpectations: ["Button"],
  rubrics: [{ id: "clear", description: "The action is clear", weight: 1 }]
};

describe("benchmark tasks", () => {
  it("ships the ten upstream intent-level tasks", () => {
    expect(BUNDLED_TASKS.map(task => task.id)).toEqual([
      "cancel-plan-action-hierarchy",
      "confirm-account-deletion",
      "connection-status-indicator",
      "empty-state-devices",
      "form-validation-errors",
      "onboarding-flow",
      "paginated-activity-log",
      "password-visibility",
      "settings-toggle-section",
      "success-feedback"
    ]);
  });

  it("rejects prompts that reveal hidden component expectations", () => {
    expect(() =>
      validateTask({ ...validTask, id: "leak", prompt: "Use Button here." })
    ).toThrow('task "leak" prompt reveals hidden component "Button"');
  });

  it("rejects duplicate ids, empty prompts, and missing rubrics", () => {
    expect(() => loadTasks([validTask, { ...validTask }])).toThrow(
      /duplicate task id "valid"/
    );
    expect(() => validateTask({ ...validTask, prompt: " " })).toThrow(
      /prompt must not be empty/
    );
    expect(() => validateTask({ ...validTask, rubrics: [] })).toThrow(
      /requires at least one rubric/
    );
  });
});

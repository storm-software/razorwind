import { beforeEach, describe, expect, it, vi } from "vitest";

const { createExecute, execute, generator } = vi.hoisted(() => ({
  createExecute: vi.fn(),
  execute: vi.fn(),
  generator: Symbol("razorwind-generator")
}));

vi.mock("@power-plant/core", () => ({ createExecute }));
vi.mock("@razorwind/core", () => ({ generator }));

import handler, {
  metadata
} from "../../../src/commands/generate/command";

describe("Generate command metadata", () => {
  it("has a title", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title.length).toBeGreaterThan(0);
  });

  it("has a description", () => {
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description.length).toBeGreaterThan(0);
  });

  it("has an icon", () => {
    expect(typeof metadata.icon).toBe("string");
  });

  it("title is 'Generate'", () => {
    expect(metadata.title).toBe("Generate");
  });
});

describe("generate command", () => {
  beforeEach(() => {
    execute.mockReset();
    createExecute.mockReset();
    createExecute.mockResolvedValue(execute);
  });

  it("runs the Razorwind generator in a session rooted at the requested directory", async () => {
    await handler({ root: "/tmp/razorwind-generate" });

    expect(createExecute).toHaveBeenCalledWith({
      cwd: "/tmp/razorwind-generate"
    });
    expect(execute).toHaveBeenCalledWith(generator, {});
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { clean, createEngine } = vi.hoisted(() => ({
  clean: vi.fn(),
  createEngine: vi.fn()
}));

vi.mock("@shell-shock/core/engine", () => ({ createEngine }));

import handler, {
  metadata
} from "../../../src/commands/clean/command";

describe("clean command metadata", () => {
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

  it("title is 'Clean'", () => {
    expect(metadata.title).toBe("Clean");
  });
});

describe("clean command", () => {
  beforeEach(() => {
    clean.mockReset();
    createEngine.mockReset();
    createEngine.mockResolvedValue({ clean });
  });

  it("runs Shell Shock cleanup at the requested root", async () => {
    await handler({ root: "/tmp/razorwind-clean" });

    expect(createEngine).toHaveBeenCalledWith({
      root: "/tmp/razorwind-clean"
    });
    expect(clean).toHaveBeenCalledWith({});
  });
});

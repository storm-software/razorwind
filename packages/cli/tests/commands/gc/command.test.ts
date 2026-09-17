import { beforeEach, describe, expect, it, vi } from "vitest";

const { removeDirectory, resolveConfig } = vi.hoisted(() => ({
  removeDirectory: vi.fn(),
  resolveConfig: vi.fn()
}));

vi.mock("@razorwind/core", () => ({ resolveConfig }));
vi.mock("@stryke/fs", () => ({ removeDirectory }));

import handler, { metadata } from "../../../src/commands/gc/command";

describe("Garbage Collection command metadata", () => {
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

  it("title is 'Garbage Collection'", () => {
    expect(metadata.title).toBe("Garbage Collection");
  });
});

describe("gc command", () => {
  beforeEach(() => {
    resolveConfig.mockReset();
    removeDirectory.mockReset();
    resolveConfig.mockResolvedValue({
      envPaths: {
        data: "/tmp/razorwind-data",
        cache: "/tmp/razorwind-cache",
        log: "/tmp/razorwind-log",
        temp: "/tmp/razorwind-temp"
      }
    });
  });

  it("uses the type option to remove only the selected environment path", async () => {
    await handler({ type: "cache" });

    expect(removeDirectory).toHaveBeenCalledTimes(1);
    expect(removeDirectory).toHaveBeenCalledWith("/tmp/razorwind-cache");
  });
});

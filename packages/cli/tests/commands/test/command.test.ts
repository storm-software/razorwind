import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import handler, { metadata } from "../../../src/commands/test/command";

describe("Test command metadata", () => {
  it("title is 'Test'", () => {
    expect(metadata.title).toBe("Test");
  });
});

describe("test command", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "razorwind-a11y-"));
    process.exitCode = undefined;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("passes for accessible HTML", async () => {
    await writeFile(
      join(dir, "good.html"),
      `<!doctype html><html lang="en"><head><title>Good</title></head><body><main><h1>Hi</h1><img src="a.png" alt="A"></main></body></html>`
    );

    await handler({}, dir);

    expect(process.exitCode).toBeUndefined();
  });

  it("fails for inaccessible HTML", async () => {
    const file = join(dir, "bad.html");
    await writeFile(file, `<html><body><img src="a.png"></body></html>`);

    await handler({ tags: ["wcag2a"] }, file);

    expect(process.exitCode).toBe(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("image-alt")
    );
  });

  it("throws when no targets are provided", async () => {
    await expect(handler({})).rejects.toThrow("No targets provided");
  });
});

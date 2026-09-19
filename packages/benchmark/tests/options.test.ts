import { describe, expect, it } from "vitest";
import { resolveBenchmarkOptions } from "../src/options";

describe("resolveBenchmarkOptions", () => {
  it("uses the bounded no-judge smoke defaults", () => {
    expect(resolveBenchmarkOptions({}, "/workspace")).toMatchObject({
      profile: "smoke",
      contexts: ["bare", "agents-md"],
      repetitions: 1,
      concurrency: 1,
      judge: undefined,
      outputPath: "benchmark",
      cwd: "/workspace"
    });
  });

  it.each(["../escape", "/absolute", "benchmark/../../escape"])(
    "rejects unsafe output path %s",
    outputPath => {
      expect(() =>
        resolveBenchmarkOptions({ outputPath }, "/workspace")
      ).toThrow(/outputPath must be a relative path inside the output root/);
    }
  );
});

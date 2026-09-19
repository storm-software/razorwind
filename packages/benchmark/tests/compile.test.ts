import { writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  disposeFixture,
  provisionFixture,
  type Fixture
} from "../src/engine/fixture";
import { gradeCompile } from "../src/grade/compile";
import { resolveBenchmarkOptions } from "../src/options";
import type { BenchmarkTask, GroundTruth } from "../src/types";

const task: BenchmarkTask = {
  id: "button",
  title: "Button",
  prompt: "Build a button example.",
  rubrics: [{ id: "clear", description: "Clear action", weight: 1 }]
};
const fixtures: Fixture[] = [];
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(disposeFixture));
});

async function fixtureFor(props: GroundTruth["components"][string]["props"]) {
  const fixture = await provisionFixture({
    options: resolveBenchmarkOptions({}, process.cwd()),
    context: "bare",
    task,
    groundTruth: {
      packageName: "@acme/ui",
      components: {
        Button: { name: "button", exportName: "Button", props }
      },
      tokens: []
    }
  });
  fixtures.push(fixture);
  return fixture;
}

describe("compile grading", () => {
  it("passes valid generated component usage", async () => {
    const fixture = await fixtureFor({
      tone: { required: false, type: '"primary" | "danger"' }
    });
    await writeFile(
      fixture.entryPath,
      'import { Button } from "@acme/ui"; export default () => <Button tone="primary" />;\n'
    );
    expect(await gradeCompile(fixture)).toEqual({
      dimension: "compile",
      score: 100,
      gate: "pass",
      findings: []
    });
  });

  it("hard-fails invalid documented prop values with a diagnostic", async () => {
    const fixture = await fixtureFor({
      tone: { required: false, type: '"primary" | "danger"' }
    });
    await writeFile(
      fixture.entryPath,
      'import { Button } from "@acme/ui"; export default () => <Button tone="invented" />;\n'
    );
    const result = await gradeCompile(fixture);
    expect(result.gate).toBe("fail");
    expect(result.score).toBe(0);
    expect(result.findings[0]?.message).toMatch(/invented.*primary.*danger/);
  });

  it("keeps unknown component props permissive", async () => {
    const fixture = await fixtureFor(null);
    await writeFile(
      fixture.entryPath,
      'import { Button } from "@acme/ui"; export default () => <Button anything="allowed" />;\n'
    );
    expect((await gradeCompile(fixture)).gate).toBe("pass");
  });
});

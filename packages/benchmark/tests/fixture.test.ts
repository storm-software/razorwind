import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectFixtureSources,
  disposeFixture,
  provisionFixture,
  type Fixture
} from "../src/engine/fixture";
import { resolveBenchmarkOptions } from "../src/options";
import type { BenchmarkTask, GroundTruth } from "../src/types";

const task: BenchmarkTask = {
  id: "button",
  title: "Button",
  prompt: "Build a button example.",
  rubrics: [{ id: "clear", description: "Clear action", weight: 1 }]
};
const groundTruth: GroundTruth = {
  packageName: "@acme/ui",
  components: {
    Button: {
      name: "button",
      exportName: "Button",
      props: { tone: { required: false, type: '"primary" | "danger"' } }
    }
  },
  tokens: []
};

const fixtures: Fixture[] = [];
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(disposeFixture));
});

async function sourceRoot() {
  const root = await mkdtemp(join(tmpdir(), "benchmark-context-"));
  await writeFile(join(root, "AGENTS.md"), "Use the Acme design system.\n");
  await mkdir(join(root, "skills", "acme"), { recursive: true });
  await writeFile(join(root, "skills", "acme", "SKILL.md"), "# Acme skill\n");
  return root;
}

async function provision(
  root: string,
  context: "bare" | "agents-md" | "skill"
) {
  const fixture = await provisionFixture({
    options: resolveBenchmarkOptions(
      {
        context: { agentsMd: ["AGENTS.md"], skillDirs: ["skills/acme"] }
      },
      root
    ),
    context,
    task,
    groundTruth
  });
  fixtures.push(fixture);
  return fixture;
}

describe("fixture provisioning", () => {
  it("copies only guidance enabled by the requested context level", async () => {
    const root = await sourceRoot();
    const bare = await provision(root, "bare");
    const agents = await provision(root, "agents-md");
    const skill = await provision(root, "skill");

    await expect(
      readFile(join(bare.root, "AGENTS.md"), "utf8")
    ).rejects.toThrow();
    await expect(
      readFile(join(bare.root, ".agents/skills/acme/SKILL.md"), "utf8")
    ).rejects.toThrow();
    await expect(
      readFile(join(agents.root, "AGENTS.md"), "utf8")
    ).resolves.toContain("Acme");
    await expect(
      readFile(join(agents.root, ".agents/skills/acme/SKILL.md"), "utf8")
    ).rejects.toThrow();
    await expect(
      readFile(join(skill.root, "AGENTS.md"), "utf8")
    ).resolves.toContain("Acme");
    await expect(
      readFile(join(skill.root, ".agents/skills/acme/SKILL.md"), "utf8")
    ).resolves.toContain("Acme skill");
  });

  it("rejects lexical escapes and symlinks resolving outside cwd", async () => {
    const root = await sourceRoot();
    const outside = await mkdtemp(join(tmpdir(), "benchmark-outside-"));
    await writeFile(join(outside, "AGENTS.md"), "outside\n");
    await symlink(join(outside, "AGENTS.md"), join(root, "escape.md"));

    await expect(
      provisionFixture({
        options: resolveBenchmarkOptions(
          { context: { agentsMd: ["../escape"] } },
          root
        ),
        context: "agents-md",
        task,
        groundTruth
      })
    ).rejects.toThrow(/inside/);
    await expect(
      provisionFixture({
        options: resolveBenchmarkOptions(
          { context: { agentsMd: ["escape.md"] } },
          root
        ),
        context: "agents-md",
        task,
        groundTruth
      })
    ).rejects.toThrow(/real path.*outside/i);
  });

  it("seeds a compilable task and rejects collected symlink escapes", async () => {
    const root = await sourceRoot();
    const fixture = await provision(root, "bare");

    for (const path of [
      "package.json",
      "tsconfig.json",
      "types/react.d.ts",
      "types/design-system.d.ts",
      "src/task/index.tsx",
      "src/task/README.md"
    ]) {
      await expect(
        readFile(join(fixture.root, path), "utf8")
      ).resolves.toBeTruthy();
    }
    await expect(
      readFile(join(fixture.taskDir, "README.md"), "utf8")
    ).resolves.toContain("src/task/");
    expect(await collectFixtureSources(fixture)).toEqual([
      expect.objectContaining({ path: "src/task/index.tsx" })
    ]);

    const outside = join(root, "outside.tsx");
    await writeFile(outside, "export const outside = true;\n");
    await symlink(await realpath(outside), join(fixture.taskDir, "escape.tsx"));
    await expect(collectFixtureSources(fixture)).rejects.toThrow(
      /outside src\/task/i
    );
  });

  it("rejects replacement of the trusted task directory", async () => {
    const root = await sourceRoot();
    const fixture = await provision(root, "bare");
    const moved = `${fixture.taskDir}-moved`;
    await rename(fixture.taskDir, moved);
    await symlink(root, fixture.taskDir);

    await expect(collectFixtureSources(fixture)).rejects.toThrow(
      /task directory.*replaced|outside src\/task/i
    );
  });
});

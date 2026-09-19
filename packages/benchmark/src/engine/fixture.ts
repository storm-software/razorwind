import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { assertSafeRelativePath } from "../options";
import { renderComponentDeclarations } from "../schema";
import type {
  BenchmarkTask,
  ContextLevel,
  GroundTruth,
  ResolvedBenchmarkOptions
} from "../types";

const FIXTURE_PREFIX = join(tmpdir(), "razorwind-benchmark-");
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

export interface Fixture {
  root: string;
  taskDir: string;
  trustedRoot: string;
  trustedTaskDir: string;
  entryPath: string;
  tsconfigPath: string;
  reactDeclarations: string;
  designSystemDeclarations: string;
  groundTruth: GroundTruth;
  task: BenchmarkTask;
}

export interface FixtureSource {
  path: string;
  source: string;
}

export interface ProvisionFixtureRequest {
  options: ResolvedBenchmarkOptions;
  context: ContextLevel;
  task: BenchmarkTask;
  groundTruth: GroundTruth;
}

function isInside(root: string, target: string): boolean {
  const path = relative(root, target);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}

async function safeContextSource(
  cwd: string,
  configuredPath: string
): Promise<string> {
  const safePath = assertSafeRelativePath(configuredPath, "context path");
  const lexical = resolve(cwd, safePath);
  if (!isInside(cwd, lexical)) {
    throw new Error(`Context path '${configuredPath}' must stay inside ${cwd}`);
  }
  const [realCwd, realSource] = await Promise.all([
    realpath(cwd),
    realpath(lexical)
  ]);
  if (!isInside(realCwd, realSource)) {
    throw new Error(
      `Context real path '${realSource}' resolves outside ${realCwd}`
    );
  }
  const sourceStat = await stat(realSource);
  if (!sourceStat.isFile() && !sourceStat.isDirectory()) {
    throw new Error(
      `Context source '${configuredPath}' must be a regular file or directory`
    );
  }
  return realSource;
}

async function validateContextTree(
  root: string,
  source: string,
  seen = new Set<string>()
): Promise<void> {
  const resolved = await realpath(source);
  if (!isInside(root, resolved)) {
    throw new Error(`Context real path '${resolved}' resolves outside ${root}`);
  }
  if (seen.has(resolved)) return;
  seen.add(resolved);
  const sourceStat = await stat(resolved);
  if (!sourceStat.isDirectory()) return;
  for (const entry of await readdir(resolved)) {
    await validateContextTree(root, join(resolved, entry), seen);
  }
}

export async function validateContextSources(
  options: ResolvedBenchmarkOptions
): Promise<void> {
  const realCwd = await realpath(options.cwd);
  for (const source of [
    ...options.context.agentsMd,
    ...options.context.skillDirs
  ]) {
    const resolved = await safeContextSource(options.cwd, source);
    await validateContextTree(realCwd, resolved);
  }
}

async function copyContextSource(
  cwd: string,
  source: string,
  destination: string
) {
  const resolved = await safeContextSource(cwd, source);
  await validateContextTree(await realpath(cwd), resolved);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await cp(resolved, destination, {
    recursive: true,
    errorOnExist: true,
    dereference: true
  });
}

const REACT_DECLARATIONS = `
declare namespace JSX {
  interface Element {}
  interface IntrinsicAttributes { key?: string | number }
  interface IntrinsicElements { [element: string]: Record<string, unknown> }
}
declare module "react" {
  export type ReactNode = unknown;
  export type CSSProperties = Record<string, string | number | undefined>;
  export type ComponentType<Props = Record<string, unknown>> = (props: Props) => JSX.Element | null;
  export type Dispatch<Value> = (value: Value) => void;
  export type SetStateAction<Value> = Value | ((previous: Value) => Value);
  export function useState<Value>(initial: Value | (() => Value)): [Value, Dispatch<SetStateAction<Value>>];
  export function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void;
  export function useMemo<Value>(factory: () => Value, dependencies: readonly unknown[]): Value;
  export function useCallback<Value extends (...args: never[]) => unknown>(callback: Value, dependencies: readonly unknown[]): Value;
  export function useRef<Value>(initial: Value): { current: Value };
}
declare module "react/jsx-runtime" {
  export const Fragment: unique symbol;
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
}
`;

function fixtureTsconfig() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: []
      },
      include: ["src/**/*", "types/**/*"]
    },
    null,
    2
  )}\n`;
}

export async function provisionFixture(
  request: ProvisionFixtureRequest
): Promise<Fixture> {
  const root = await mkdtemp(FIXTURE_PREFIX);
  const taskDir = join(root, "src", "task");
  const entryPath = join(taskDir, "index.tsx");
  const tsconfigPath = join(root, "tsconfig.json");
  const designSystemDeclarations = renderComponentDeclarations(
    request.groundTruth
  );
  try {
    await Promise.all([
      mkdir(taskDir, { recursive: true }),
      mkdir(join(root, "types"), { recursive: true })
    ]);
    await Promise.all([
      writeFile(
        join(root, "package.json"),
        '{"name":"razorwind-benchmark-fixture","private":true,"type":"module"}\n'
      ),
      writeFile(tsconfigPath, fixtureTsconfig()),
      writeFile(
        join(root, "types", "react.d.ts"),
        REACT_DECLARATIONS.trimStart()
      ),
      writeFile(
        join(root, "types", "design-system.d.ts"),
        designSystemDeclarations
      ),
      writeFile(
        entryPath,
        "export default function Example() { return <></>; }\n"
      ),
      writeFile(
        join(taskDir, "README.md"),
        `# ${request.task.title}\n\n${request.task.prompt}\n\nOnly edit files inside \`src/task/\`.\n`
      )
    ]);

    if (request.context === "agents-md" || request.context === "skill") {
      for (const source of request.options.context.agentsMd) {
        await copyContextSource(
          request.options.cwd,
          source,
          join(root, basename(source))
        );
      }
    }
    if (request.context === "skill") {
      for (const source of request.options.context.skillDirs) {
        await copyContextSource(
          request.options.cwd,
          source,
          join(root, ".agents", "skills", basename(source))
        );
      }
    }
    return {
      root,
      taskDir,
      trustedRoot: await realpath(root),
      trustedTaskDir: await realpath(taskDir),
      entryPath,
      tsconfigPath,
      reactDeclarations: REACT_DECLARATIONS.trimStart(),
      designSystemDeclarations,
      groundTruth: request.groundTruth,
      task: request.task
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function collectFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else files.push(path);
  }
  return files;
}

export async function collectFixtureSources(
  fixture: Fixture
): Promise<FixtureSource[]> {
  const realRoot = await realpath(fixture.root);
  const realTaskDir = await realpath(fixture.taskDir);
  if (
    realRoot !== fixture.trustedRoot ||
    realTaskDir !== fixture.trustedTaskDir ||
    !isInside(realRoot, realTaskDir)
  ) {
    throw new Error(
      "Benchmark task directory was replaced or resolves outside src/task"
    );
  }
  const sources: FixtureSource[] = [];
  for (const path of (await collectFiles(fixture.taskDir)).sort()) {
    const resolved = await realpath(path);
    if (!isInside(realTaskDir, resolved)) {
      throw new Error(`Collected source '${path}' resolves outside src/task`);
    }
    if (!(await lstat(resolved)).isFile()) continue;
    const extension = `.${resolved.split(".").pop() ?? ""}`;
    if (!SOURCE_EXTENSIONS.has(extension)) continue;
    sources.push({
      path: relative(fixture.root, path).split(sep).join("/"),
      source: await readFile(resolved, "utf8")
    });
  }
  return sources;
}

export async function disposeFixture(fixture: Fixture): Promise<void> {
  const resolved = resolve(fixture.root);
  if (!resolved.startsWith(FIXTURE_PREFIX)) {
    throw new Error(`Refusing to remove non-benchmark fixture '${resolved}'`);
  }
  await rm(resolved, { recursive: true, force: true });
}

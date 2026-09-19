import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const MAX_CAPTURE_BYTES = 1_000_000;

export interface ProcessRequest {
  executable: string;
  args: string[];
  cwd: string;
  stdin?: string;
  timeoutMs: number;
  env?: Record<string, string | undefined>;
  redactions?: string[];
}

export interface ProcessResult {
  ok: boolean;
  timedOut: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  transcript: string;
}

export type ProcessRunner = (request: ProcessRequest) => Promise<ProcessResult>;
export type SpawnProcess = (
  executable: string,
  args: string[],
  options: Parameters<typeof spawn>[2]
) => ChildProcessWithoutNullStreams;

function appendBounded(existing: string, chunk: Buffer | string): string {
  const combined = existing + chunk.toString();
  return combined.length > MAX_CAPTURE_BYTES
    ? combined.slice(-MAX_CAPTURE_BYTES)
    : combined;
}

function redact(text: string, values: string[]): string {
  return values
    .filter(value => value.length > 0)
    .reduce((output, value) => output.replaceAll(value, "[REDACTED]"), text);
}

export async function runProcess(
  request: ProcessRequest,
  spawnProcess: SpawnProcess = spawn as SpawnProcess
): Promise<ProcessResult> {
  const startedAt = Date.now();
  const child = spawnProcess(request.executable, request.args, {
    cwd: request.cwd,
    env: { ...process.env, ...request.env },
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["pipe", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let settled = false;

  const killTree = (signal: NodeJS.Signals) => {
    try {
      if (process.platform !== "win32" && child.pid) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch {
      child.kill(signal);
    }
  };

  return await new Promise(resolveResult => {
    const timeout = setTimeout(() => {
      timedOut = true;
      killTree("SIGTERM");
      setTimeout(() => killTree("SIGKILL"), 5000).unref();
    }, request.timeoutMs);

    child.stdout.on("data", chunk => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", chunk => {
      stderr = appendBounded(stderr, chunk);
    });

    const settle = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const redactions = [
        request.stdin ?? "",
        ...Object.values(request.env ?? {}).filter(
          (value): value is string => typeof value === "string"
        ),
        ...(request.redactions ?? [])
      ];
      const transcript = redact(`${stdout}${stderr}`, redactions);
      resolveResult({
        ok: !timedOut && exitCode === 0,
        timedOut,
        exitCode,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        transcript
      });
    };

    child.on("error", error => {
      stderr = appendBounded(stderr, error.message);
      settle(null);
    });
    child.on("close", exitCode => settle(exitCode));
    if (request.stdin !== undefined) child.stdin.write(request.stdin);
    child.stdin.end();
  });
}

import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import {
  claudeCodeAdapter,
  codexAdapter,
  runProcess,
  type ProcessRequest,
  type ProcessResult,
  type ProcessRunner,
  type SpawnProcess
} from "../src/agents";

function result(overrides: Partial<ProcessResult> = {}): ProcessResult {
  return {
    ok: true,
    timedOut: false,
    exitCode: 0,
    durationMs: 12,
    stdout: "",
    stderr: "",
    transcript: "",
    ...overrides
  };
}

function recordingRunner(output = result()) {
  const requests: ProcessRequest[] = [];
  const runner: ProcessRunner = async request => {
    requests.push(request);
    return output;
  };
  return { requests, runner };
}

describe("agent adapters", () => {
  it("uses a shell-free process boundary and redacts explicit environment values", async () => {
    const secret = "provider-secret";
    const spawn = vi.fn<SpawnProcess>((_executable, _args, options) => {
      const child = new EventEmitter() as ChildProcessWithoutNullStreams;
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.pid = 123;
      child.kill = vi.fn(() => true);
      queueMicrotask(() => {
        child.stdout.write(`result=${secret}\n`);
        child.emit("close", 0);
      });
      expect(options).toEqual(
        expect.objectContaining({
          shell: false,
          stdio: ["pipe", "pipe", "pipe"]
        })
      );
      return child;
    });

    const output = await runProcess(
      {
        executable: "agent",
        args: ["run"],
        cwd: process.cwd(),
        timeoutMs: 1000,
        env: { PROVIDER_TOKEN: secret }
      },
      spawn
    );
    expect(output.stdout).toContain(secret);
    expect(output.transcript).not.toContain(secret);
    expect(output.transcript).toContain("[REDACTED]");
  });

  it("constructs Claude Code arguments without a shell or prompt argument", async () => {
    const { requests, runner } = recordingRunner(
      result({
        stdout:
          '{"type":"result","result":"done","duration_ms":8,"num_turns":2,"total_cost_usd":0.01}\n'
      })
    );
    const prompt = "Build a private button prompt";
    await claudeCodeAdapter.run(
      {
        model: "sonnet",
        prompt,
        fixturePath: "/tmp/fixture",
        timeoutMs: 1000
      },
      runner
    );

    expect(requests[0]).toEqual(
      expect.objectContaining({
        executable: "claude",
        cwd: "/tmp/fixture",
        stdin: prompt,
        args: [
          "-p",
          "--output-format",
          "stream-json",
          "--verbose",
          "--model",
          "sonnet",
          "--permission-mode",
          "acceptEdits",
          "--strict-mcp-config"
        ]
      })
    );
    expect(requests[0]?.args).not.toEqual(
      expect.arrayContaining(["sh", "bash", "-c", prompt])
    );
  });

  it("constructs non-interactive Codex JSON arguments and sends the prompt on stdin", async () => {
    const { requests, runner } = recordingRunner(
      result({
        stdout:
          '{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":4}}\n'
      })
    );
    const prompt = "Build a private button prompt";
    await codexAdapter.run(
      {
        model: "gpt-5",
        prompt,
        fixturePath: "/tmp/fixture",
        timeoutMs: 1000
      },
      runner
    );

    expect(requests[0]).toEqual(
      expect.objectContaining({
        executable: "codex",
        cwd: "/tmp/fixture",
        stdin: prompt,
        args: [
          "exec",
          "--json",
          "--sandbox",
          "workspace-write",
          "--skip-git-repo-check",
          "--model",
          "gpt-5",
          "-"
        ]
      })
    );
    expect(requests[0]?.args).not.toEqual(
      expect.arrayContaining(["sh", "bash", "-c", prompt])
    );
  });

  it("normalizes timeouts without throwing", async () => {
    const runner = vi.fn<ProcessRunner>().mockResolvedValue(
      result({
        ok: false,
        timedOut: true,
        exitCode: null,
        durationMs: 1000,
        stderr: "terminated"
      })
    );
    await expect(
      codexAdapter.run(
        {
          model: "gpt-5",
          prompt: "prompt",
          fixturePath: "/tmp/fixture",
          timeoutMs: 1000
        },
        runner
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        timedOut: true,
        exitCode: null,
        resultText: "terminated"
      })
    );
  });

  it("detects executables through the same injected runner", async () => {
    const { requests, runner } = recordingRunner(
      result({ stdout: "codex-cli 1.2.3\n" })
    );
    await expect(codexAdapter.detect(runner)).resolves.toEqual({
      ok: true,
      version: "codex-cli 1.2.3"
    });
    expect(requests[0]).toEqual(
      expect.objectContaining({
        executable: "codex",
        args: ["--version"]
      })
    );
  });

  it("normalizes stdin stream failures instead of crashing the host", async () => {
    const spawn = vi.fn<SpawnProcess>(() => {
      const child = new EventEmitter() as ChildProcessWithoutNullStreams;
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.pid = 123;
      child.kill = vi.fn(() => true);
      child.stdin.destroy(new Error("stdin closed"));
      return child;
    });

    await expect(
      runProcess(
        {
          executable: "agent",
          args: [],
          cwd: process.cwd(),
          stdin: "prompt",
          timeoutMs: 1000
        },
        spawn
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        exitCode: null,
        stderr: expect.stringContaining("stdin closed")
      })
    );
  });
});

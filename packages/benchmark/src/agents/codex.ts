/**
 * Inspired by christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import type { AgentAdapter, AgentRunResult } from "./index";
import { runProcess } from "./process";

interface CodexEvent {
  type?: string;
  message?: string;
  error?: { message?: string };
  item?: { type?: string; text?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cached_input_tokens?: number;
  };
}

function parseEvents(output: string): {
  resultText?: string;
  error?: string;
  usage?: CodexEvent["usage"];
} {
  let resultText: string | undefined;
  let error: string | undefined;
  let usage: CodexEvent["usage"];
  for (const line of output.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const event = JSON.parse(line) as CodexEvent;
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message"
      ) {
        resultText = event.item.text;
      }
      if (event.type === "error" || event.type === "turn.failed") {
        error =
          event.error?.message ?? event.message ?? "Codex execution failed";
      }
      if (event.usage) usage = event.usage;
    } catch {
      // Ignore non-JSON diagnostics in an otherwise valid JSONL stream.
    }
  }
  return { resultText, error, usage };
}

export const codexAdapter: AgentAdapter = {
  id: "codex",
  defaultModel: "gpt-5",
  async detect(runner = runProcess) {
    const result = await runner({
      executable: "codex",
      args: ["--version"],
      cwd: process.cwd(),
      timeoutMs: 15_000
    });
    return result.ok
      ? { ok: true, version: result.stdout.trim() }
      : { ok: false, error: result.stderr || "Codex is unavailable" };
  },
  async run(request, runner = runProcess): Promise<AgentRunResult> {
    const processResult = await runner({
      executable: "codex",
      args: [
        "exec",
        "--json",
        "--sandbox",
        "workspace-write",
        "--skip-git-repo-check",
        "--model",
        request.model,
        "-"
      ],
      cwd: request.fixturePath,
      stdin: request.prompt,
      timeoutMs: request.timeoutMs,
      env: request.env,
      redactions: [request.prompt]
    });
    const parsed = parseEvents(processResult.stdout);
    const ok = processResult.ok && !parsed.error;
    return {
      ok,
      timedOut: processResult.timedOut,
      exitCode: processResult.exitCode,
      durationMs: processResult.durationMs,
      transcript: processResult.transcript,
      resultText:
        parsed.resultText ??
        parsed.error ??
        (ok ? undefined : processResult.stderr || undefined),
      usage: {
        inputTokens: parsed.usage?.input_tokens,
        outputTokens: parsed.usage?.output_tokens
      }
    };
  }
};

/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { AgentAdapter, AgentRunResult } from "./index";
import { runProcess } from "./process";

interface ClaudeResultEvent {
  type?: string;
  is_error?: boolean;
  result?: string;
  duration_ms?: number;
  num_turns?: number;
  total_cost_usd?: number;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function resultEvent(output: string): ClaudeResultEvent | undefined {
  let result: ClaudeResultEvent | undefined;
  for (const line of output.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const event = JSON.parse(line) as ClaudeResultEvent;
      if (event.type === "result") result = event;
    } catch {
      // The CLI may interleave plain diagnostics with JSON events.
    }
  }
  return result;
}

export const claudeCodeAdapter: AgentAdapter = {
  id: "claude-code",
  defaultModel: "sonnet",
  async detect(runner = runProcess) {
    const result = await runner({
      executable: "claude",
      args: ["--version"],
      cwd: process.cwd(),
      timeoutMs: 15_000
    });

    return result.ok
      ? { ok: true, version: result.stdout.trim() }
      : { ok: false, error: result.stderr || "Claude Code is unavailable" };
  },
  async run(request, runner = runProcess): Promise<AgentRunResult> {
    const processResult = await runner({
      executable: "claude",
      args: [
        "-p",
        "--output-format",
        "stream-json",
        "--verbose",
        "--model",
        request.model,
        "--permission-mode",
        "acceptEdits",
        "--strict-mcp-config"
      ],
      cwd: request.fixturePath,
      stdin: request.prompt,
      timeoutMs: request.timeoutMs,
      env: request.env,
      redactions: [request.prompt]
    });
    const event = resultEvent(processResult.stdout);
    const ok = processResult.ok && !event?.is_error;

    return {
      ok,
      timedOut: processResult.timedOut,
      exitCode: processResult.exitCode,
      durationMs: event?.duration_ms ?? processResult.durationMs,
      transcript: processResult.transcript,
      resultText:
        event?.result ?? (ok ? undefined : processResult.stderr || undefined),
      usage: {
        inputTokens: event?.usage?.input_tokens,
        outputTokens: event?.usage?.output_tokens,
        costUsd: event?.total_cost_usd,
        turns: event?.num_turns
      }
    };
  }
};

import { spawn } from "node:child_process";
import type { InferOpts, InferResult, Runner, StreamEvent } from "./index.ts";

/**
 * Codex CLI doesn't expose a --system-prompt flag. We inject the persona profile
 * into the first user message via a clearly-marked block. After the first turn,
 * we use `codex exec resume <session-id>` to continue the conversation, so the
 * system context is preserved server-side.
 */
export class CodexRunner implements Runner {
  readonly name = "codex" as const;
  readonly defaultModel = undefined; // codex picks
  readonly supportsStreaming = false;
  readonly supportsNativeResume = true;

  private buildPrompt(opts: InferOpts): string {
    const last = opts.messages[opts.messages.length - 1];
    if (!last || last.role !== "user") {
      throw new Error("CodexRunner expects the last message to be from the user.");
    }
    if (opts.hostSessionId) {
      // Continuing a session, system context already injected on turn 1.
      return last.content;
    }
    // First turn, inject the system prompt as a preamble.
    return `${opts.system}\n\n---\n\n${last.content}`;
  }

  private buildArgs(opts: InferOpts): string[] {
    const args: string[] = ["exec"];
    if (opts.hostSessionId) {
      args.push("resume", opts.hostSessionId);
    }
    args.push("--json", "--skip-git-repo-check");
    return args;
  }

  async infer(opts: InferOpts): Promise<InferResult> {
    const args = this.buildArgs(opts);
    const prompt = this.buildPrompt(opts);
    args.push(prompt);

    return new Promise((resolve, reject) => {
      const proc = spawn("codex", args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`codex exited ${code}: ${stderr || stdout}`));
          return;
        }

        let text = "";
        let hostSessionId: string | undefined;

        for (const line of stdout.split("\n")) {
          const t = line.trim();
          if (!t) continue;
          try {
            const event = JSON.parse(t);
            const sid = event.session_id ?? event.sessionId ?? event?.session?.id;
            if (typeof sid === "string") hostSessionId = sid;
            const msg =
              event.message ??
              event?.agent_message?.text ??
              event?.final_message ??
              event?.content;
            if (typeof msg === "string") text = msg;
          } catch {
            // Treat as plain text accumulation.
            text += line + "\n";
          }
        }

        resolve({ text: text.trim(), hostSessionId });
      });
    });
  }
}

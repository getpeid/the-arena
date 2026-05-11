import { spawn } from "node:child_process";
import type { InferOpts, InferResult, Runner, StreamEvent } from "./index.ts";

export class ClaudeCodeRunner implements Runner {
  readonly name = "claude" as const;
  readonly defaultModel = "claude-opus-4-7";
  readonly supportsStreaming = true;
  readonly supportsNativeResume = true;

  private buildBaseArgs(opts: InferOpts, format: "json" | "stream-json"): string[] {
    const args: string[] = ["-p"];

    if (opts.hostSessionId) {
      args.push("--resume", opts.hostSessionId);
    } else {
      args.push("--system-prompt", opts.system);
    }

    // Disable all tools so the persona is pure model inference — no file reads,
    // no bash, no skills. We deliberately do NOT use --bare here: --bare disables
    // OAuth/keychain auth and forces ANTHROPIC_API_KEY, defeating the whole point
    // of using the user's plan.
    args.push("--tools", "");
    args.push("--disable-slash-commands");
    args.push("--output-format", format);
    if (format === "stream-json") {
      args.push("--verbose", "--include-partial-messages");
    }

    if (opts.model) args.push("--model", opts.model);

    return args;
  }

  private latestUserMessage(opts: InferOpts): string {
    const last = opts.messages[opts.messages.length - 1];
    if (!last || last.role !== "user") {
      throw new Error("ClaudeCodeRunner expects the last message to be from the user.");
    }
    return last.content;
  }

  async infer(opts: InferOpts): Promise<InferResult> {
    const args = this.buildBaseArgs(opts, "json");
    args.push(this.latestUserMessage(opts));

    return new Promise((resolve, reject) => {
      const proc = spawn("claude", args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("error", reject);
      proc.on("close", (code) => {
        // Try to parse JSON regardless of exit code — claude returns structured
        // errors (auth, rate-limit) as is_error:true with a useful `result` string.
        let json: any = null;
        try {
          json = JSON.parse(stdout);
        } catch {
          /* not JSON */
        }

        if (json && (json.is_error || code !== 0) && typeof json.result === "string") {
          reject(new Error(`claude: ${json.result}`));
          return;
        }
        if (code !== 0) {
          reject(new Error(`claude exited ${code}: ${(stderr || stdout).trim()}`));
          return;
        }
        if (json) {
          const text =
            (json.result as string | undefined) ??
            (json.content as string | undefined) ??
            (json.text as string | undefined) ??
            stdout.trim();
          const hostSessionId = (json.session_id ?? json.sessionId) as string | undefined;
          resolve({ text, hostSessionId });
          return;
        }
        resolve({ text: stdout.trim() });
      });
    });
  }

  async *inferStream(opts: InferOpts): AsyncIterable<StreamEvent> {
    const args = this.buildBaseArgs(opts, "stream-json");
    args.push(this.latestUserMessage(opts));

    const proc = spawn("claude", args, { stdio: ["ignore", "pipe", "pipe"] });
    let buffer = "";
    let fullText = "";
    let hostSessionId: string | undefined;
    let stderr = "";

    proc.stderr.on("data", (d) => (stderr += d.toString()));

    for await (const chunk of proc.stdout as AsyncIterable<Buffer>) {
      buffer += chunk.toString();
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);

          const deltaText: string | undefined =
            event?.event?.delta?.type === "text_delta"
              ? event.event.delta.text
              : event?.delta?.type === "text_delta"
                ? event.delta.text
                : undefined;
          if (deltaText) {
            fullText += deltaText;
            yield { chunk: deltaText };
            continue;
          }

          const sid = event.session_id ?? event.sessionId ?? event?.event?.session_id;
          if (typeof sid === "string") hostSessionId = sid;

          if (event.type === "result" && typeof event.result === "string") {
            fullText = event.result;
          }
        } catch {
          // Non-JSON line — ignore.
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      if (proc.exitCode !== null) {
        if (proc.exitCode !== 0) reject(new Error(`claude exited ${proc.exitCode}: ${stderr}`));
        else resolve();
        return;
      }
      proc.once("close", (code) => {
        if (code !== 0) reject(new Error(`claude exited ${code}: ${stderr}`));
        else resolve();
      });
      proc.once("error", reject);
    });

    yield { done: { text: fullText, hostSessionId } };
  }
}

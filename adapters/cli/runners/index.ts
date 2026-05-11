import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { ClaudeCodeRunner } from "./claude.ts";
import { CodexRunner } from "./codex.ts";
import { AnthropicSDKRunner } from "./anthropic-sdk.ts";
import { OpenAISDKRunner } from "./openai-sdk.ts";

export type RunnerName = "claude" | "codex" | "anthropic-sdk" | "openai-sdk";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InferOpts {
  system: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  hostSessionId?: string;
}

export interface InferResult {
  text: string;
  hostSessionId?: string;
}

export interface StreamEvent {
  chunk?: string;
  done?: InferResult;
}

export interface Runner {
  readonly name: RunnerName;
  readonly defaultModel?: string;
  readonly supportsStreaming: boolean;
  readonly supportsNativeResume: boolean;
  infer(opts: InferOpts): Promise<InferResult>;
  inferStream?(opts: InferOpts): AsyncIterable<StreamEvent>;
}

interface ConfigFile {
  runner?: RunnerName;
  model?: string;
  maxTokens?: number;
}

export interface ResolvedConfig {
  runner: RunnerName;
  model?: string;
  maxTokens: number;
}

const CONFIG_PATH = join(homedir(), ".arena", "config.json");

function readConfigFile(): ConfigFile {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as ConfigFile;
  } catch (err) {
    console.error(`[arena] could not parse ${CONFIG_PATH}: ${(err as Error).message}`);
    return {};
  }
}

function isInstalled(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const RUNNER_FACTORIES: Record<RunnerName, () => Runner> = {
  claude: () => new ClaudeCodeRunner(),
  codex: () => new CodexRunner(),
  "anthropic-sdk": () => new AnthropicSDKRunner(),
  "openai-sdk": () => new OpenAISDKRunner(),
};

const VALID_RUNNERS = Object.keys(RUNNER_FACTORIES) as RunnerName[];

export function resolveRunner(flags: {
  runner?: string;
  model?: string;
  maxTokens?: number;
}): { runner: Runner; config: ResolvedConfig } {
  const file = readConfigFile();

  let chosen = (flags.runner ?? process.env.ARENA_RUNNER ?? file.runner) as
    | RunnerName
    | undefined;

  if (!chosen) {
    if (isInstalled("claude")) chosen = "claude";
    else if (process.env.ANTHROPIC_API_KEY) chosen = "anthropic-sdk";
    else if (isInstalled("codex")) chosen = "codex";
    else if (process.env.OPENAI_API_KEY) chosen = "openai-sdk";
    else {
      throw new Error(
        `No runner available. Install Claude Code (\`claude\`) or Codex CLI, ` +
          `or set ANTHROPIC_API_KEY / OPENAI_API_KEY in your shell. ` +
          `Defaults bill against your plan if you have claude/codex installed and logged in.`,
      );
    }
  }

  if (!VALID_RUNNERS.includes(chosen)) {
    throw new Error(
      `Unknown runner "${chosen}". Use one of: ${VALID_RUNNERS.join(", ")}`,
    );
  }

  const runner = RUNNER_FACTORIES[chosen]();
  const model = flags.model ?? file.model;
  const maxTokens = flags.maxTokens ?? file.maxTokens ?? 2048;

  return { runner, config: { runner: chosen, model, maxTokens } };
}

import * as readline from "node:readline";
import type { Runner, InferOpts } from "./runners/index.ts";
import { saveSession, type PitchSession } from "./sessions.ts";
import { prompt as promptStr, replHelp, farewell, ui } from "./ui.ts";

interface ReplOpts {
  runner: Runner;
  config: { model?: string; maxTokens: number };
  system: string;
  session: PitchSession;
  stream: boolean;
}

async function turn(opts: ReplOpts, userInput: string): Promise<void> {
  const { runner, config, system, session, stream } = opts;
  session.messages.push({ role: "user", content: userInput });

  const inferOpts: InferOpts = {
    system,
    messages: session.messages,
    model: config.model,
    maxTokens: config.maxTokens,
    hostSessionId: session.hostSessionId,
  };

  let response = "";
  let hostSessionId: string | undefined;

  if (stream && runner.inferStream && runner.supportsStreaming) {
    process.stdout.write("\n");
    for await (const event of runner.inferStream(inferOpts)) {
      if (event.chunk) {
        process.stdout.write(event.chunk);
        response += event.chunk;
      }
      if (event.done) {
        if (event.done.text && !response) response = event.done.text;
        hostSessionId = event.done.hostSessionId;
      }
    }
    process.stdout.write("\n\n");
  } else {
    const result = await runner.infer(inferOpts);
    response = result.text;
    hostSessionId = result.hostSessionId;
    console.log(`\n${response}\n`);
  }

  session.messages.push({ role: "assistant", content: response });
  if (hostSessionId) session.hostSessionId = hostSessionId;
  saveSession(session);
}

export async function runPitchRepl(opts: ReplOpts, openingPrompt?: string): Promise<void> {
  if (openingPrompt) {
    await turn(opts, openingPrompt);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

  replHelp();

  try {
    while (true) {
      const raw = await ask(promptStr());
      const input = raw.trim();
      if (!input) continue;

      if (input === "/exit" || input === "/quit") {
        farewell(opts.session.id);
        return;
      }
      if (input === "/save") {
        saveSession(opts.session);
        console.log(`  ${ui.dim("(saved)")}`);
        continue;
      }

      let userInput = input;
      const isVerdict = input === "/done" || input === "/verdict";
      if (isVerdict) {
        userInput =
          "I'm done. Give me your final verdict in the exact shape your profile specifies under 'How you close.'";
      }

      await turn(opts, userInput);

      if (isVerdict) {
        farewell(opts.session.id, false);
        return;
      }
    }
  } finally {
    rl.close();
  }
}

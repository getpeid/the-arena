import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { loadPersona } from "../../../core/personas.ts";
import { buildPitchSystem } from "../../../core/prompts.ts";
import { resolveRunner } from "../runners/index.ts";
import { newSessionId, saveSession, type PitchSession } from "../sessions.ts";
import { runPitchRepl } from "../repl.ts";
import { banner, header, entrance, farewell } from "../ui.ts";

type Flags = Record<string, string | boolean>;

function flagString(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

export async function pitchCommand(args: {
  persona: string | undefined;
  docPath: string | undefined;
  flags: Flags;
}): Promise<void> {
  const { persona: personaArg, docPath, flags } = args;
  if (!personaArg || !docPath) {
    throw new Error("Usage: arena pitch <persona> <doc-path>");
  }

  const resolvedPath = resolve(docPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Pitch document not found: ${resolvedPath}`);
  }
  const doc = readFileSync(resolvedPath, "utf8");
  const docSize = statSync(resolvedPath).size;
  const persona = await loadPersona(personaArg);

  const maxTokensFlag = flagString(flags, "max-tokens");
  const { runner, config } = resolveRunner({
    runner: flagString(flags, "runner"),
    model: flagString(flags, "model"),
    maxTokens: maxTokensFlag ? Number(maxTokensFlag) : undefined,
  });

  const session: PitchSession = {
    id: newSessionId("p"),
    type: "pitch",
    personas: [persona.slug],
    docPath: resolvedPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runner: runner.name,
    model: config.model,
    messages: [],
  };

  banner();
  header({
    mode: "pitch",
    personas: [{ name: persona.name, short: persona.short }],
    doc: { path: resolvedPath, size: docSize },
    runner: { name: runner.name, model: config.model ?? runner.defaultModel },
    session: session.id,
  });
  entrance(persona.name, persona.portrait);

  const system = buildPitchSystem(persona, doc, resolvedPath);
  const stream = flags["no-stream"] !== true;
  const opening =
    "[The founder hands you the document and waits for your first reaction.]";

  if (flags.once) {
    session.messages.push({ role: "user", content: opening });
    let response = "";
    let hostSessionId: string | undefined;

    if (stream && runner.inferStream && runner.supportsStreaming) {
      for await (const event of runner.inferStream({
        system,
        messages: session.messages,
        model: config.model,
        maxTokens: config.maxTokens,
      })) {
        if (event.chunk) {
          process.stdout.write(event.chunk);
          response += event.chunk;
        }
        if (event.done) {
          hostSessionId = event.done.hostSessionId;
          if (event.done.text && !response) response = event.done.text;
        }
      }
      process.stdout.write("\n");
    } else {
      const result = await runner.infer({
        system,
        messages: session.messages,
        model: config.model,
        maxTokens: config.maxTokens,
      });
      response = result.text;
      hostSessionId = result.hostSessionId;
      console.log(response);
    }

    session.messages.push({ role: "assistant", content: response });
    if (hostSessionId) session.hostSessionId = hostSessionId;
    saveSession(session);
    farewell(session.id);
    return;
  }

  await runPitchRepl({ runner, config, system, session, stream }, opening);
}

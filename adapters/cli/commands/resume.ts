import { readFileSync, existsSync, statSync } from "node:fs";
import { loadSession } from "../sessions.ts";
import { loadPersona } from "../../../core/personas.ts";
import { buildPitchSystem } from "../../../core/prompts.ts";
import { resolveRunner } from "../runners/index.ts";
import { runPitchRepl } from "../repl.ts";
import { banner, header, entrance } from "../ui.ts";

type Flags = Record<string, string | boolean>;

function flagString(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

export async function resumeCommand(id: string | undefined, flags: Flags): Promise<void> {
  if (!id) throw new Error("Usage: arena resume <session-id>");
  const session = loadSession(id);

  if (session.type !== "pitch") {
    throw new Error(
      "Resume only supports 1-on-1 pitch sessions. Panels are one-shot transcripts.",
    );
  }

  if (!existsSync(session.docPath)) {
    throw new Error(`Original doc no longer exists: ${session.docPath}`);
  }
  const doc = readFileSync(session.docPath, "utf8");
  const docSize = statSync(session.docPath).size;
  const persona = await loadPersona(session.personas[0]);

  const maxTokensFlag = flagString(flags, "max-tokens");
  const { runner, config } = resolveRunner({
    runner: flagString(flags, "runner") ?? session.runner,
    model: flagString(flags, "model") ?? session.model,
    maxTokens: maxTokensFlag ? Number(maxTokensFlag) : undefined,
  });

  const system = buildPitchSystem(persona, doc, session.docPath);
  const stream = flags["no-stream"] !== true;

  banner();
  header({
    mode: "resume",
    personas: [{ name: persona.name, short: persona.short }],
    doc: { path: session.docPath, size: docSize },
    runner: { name: runner.name, model: config.model ?? runner.defaultModel },
    session: session.id,
    priorTurns: session.messages.length,
  });
  entrance(persona.name, persona.portrait, "is back in the room");

  await runPitchRepl({ runner, config, system, session, stream });
}

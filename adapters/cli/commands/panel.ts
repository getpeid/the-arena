import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { loadPersonas } from "../../../core/personas.ts";
import { buildPanelSystem } from "../../../core/prompts.ts";
import { resolveRunner } from "../runners/index.ts";
import { newSessionId, saveSession, type PitchSession } from "../sessions.ts";
import { banner, header, panelSaved, panelClose, entrance, ui } from "../ui.ts";

type Flags = Record<string, string | boolean>;

function flagString(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

export async function panelCommand(args: {
  personas: string | undefined;
  docPath: string | undefined;
  flags: Flags;
}): Promise<void> {
  const { personas: personasArg, docPath, flags } = args;
  if (!personasArg || !docPath) {
    throw new Error("Usage: arena panel <p1,p2,p3,...> <doc-path>");
  }

  const slugs = personasArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (slugs.length < 2) {
    throw new Error("Panel needs at least 2 personas (comma-separated list).");
  }

  const resolvedPath = resolve(docPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Pitch document not found: ${resolvedPath}`);
  }
  const doc = readFileSync(resolvedPath, "utf8");
  const docSize = statSync(resolvedPath).size;
  const personas = await loadPersonas(slugs);

  const roundsFlag = flagString(flags, "rounds");
  const rounds = roundsFlag ? Number(roundsFlag) : 2;
  if (!Number.isFinite(rounds) || rounds < 1) {
    throw new Error("--rounds must be a positive integer");
  }

  const maxTokensFlag = flagString(flags, "max-tokens");
  const { runner, config } = resolveRunner({
    runner: flagString(flags, "runner"),
    model: flagString(flags, "model"),
    maxTokens: maxTokensFlag ? Number(maxTokensFlag) : 4096,
  });

  const session: PitchSession = {
    id: newSessionId("panel"),
    type: "panel",
    personas: personas.map((p) => p.slug),
    docPath: resolvedPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runner: runner.name,
    model: config.model,
    messages: [],
  };

  banner();
  header({
    mode: "panel",
    personas: personas.map((p) => ({ name: p.name, short: p.short })),
    doc: { path: resolvedPath, size: docSize },
    runner: { name: runner.name, model: config.model ?? runner.defaultModel },
    session: session.id,
    rounds,
  });

  console.log(`  ${ui.dim("━".repeat(36))}`);
  console.log(`  ${ui.dim("the panel takes their seats")}`);
  console.log(`  ${ui.dim("━".repeat(36))}\n`);

  for (const p of personas) {
    entrance(p.name, p.portrait, "takes a seat");
  }

  const system = buildPanelSystem(personas, doc, resolvedPath, rounds);
  const kick = "Begin Round 1.";
  session.messages.push({ role: "user", content: kick });

  const stream = flags["no-stream"] !== true;
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

  panelClose();
  panelSaved(session.id);
}

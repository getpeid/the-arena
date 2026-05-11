#!/usr/bin/env bun
import { listCommand } from "./commands/list.ts";
import { showCommand } from "./commands/show.ts";
import { pitchCommand } from "./commands/pitch.ts";
import { panelCommand } from "./commands/panel.ts";
import { sessionsCommand } from "./commands/sessions.ts";
import { resumeCommand } from "./commands/resume.ts";

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i += 1;
      }
    } else {
      positional.push(a);
      i += 1;
    }
  }
  return { positional, flags };
}

const HELP = `arena, pitch your idea to founder personas

Usage:
  arena list                                  show available personas
  arena show <persona>                        print a persona's full profile
  arena pitch <persona> <doc>                 1-on-1 interactive REPL
  arena panel <p1,p2,p3,...> <doc>            multi-persona debate (one-shot)
  arena sessions                              list saved sessions
  arena resume <session-id>                   continue a saved 1-on-1

Inference runners (auto-detected, override with --runner):
  claude          shells to \`claude -p\` (Claude Code; uses your plan, no API key)
  codex           shells to \`codex exec\` (Codex CLI; uses your plan, no API key)
  anthropic-sdk   uses ANTHROPIC_API_KEY (per-token billing)
  openai-sdk      uses OPENAI_API_KEY (per-token billing)

  Resolution: --runner flag · ARENA_RUNNER env · ~/.arena/config.json ·
              auto-detect: claude > anthropic-sdk > codex > openai-sdk

Flags:
  --runner <name>     pin to one of the four runners above
  --model <name>      override model (e.g. claude-opus-4-7, gpt-5.5)
  --max-tokens <n>    cap output tokens
  --rounds <n>        panel only, engagement rounds (default 2)
  --once              pitch only, non-interactive single reply
  --no-stream         disable streaming output

Slash commands inside a pitch REPL:
  /done       ask for the final verdict
  /save       checkpoint without exiting
  /exit       leave (session stays saved)

Custom personas:
  Drop a markdown file with frontmatter (name, slug, short, verdict)
  into ~/.arena/personas/. \`arena list\` finds it automatically.
`;

async function main(): Promise<void> {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const sub = positional[0];

  if (!sub || sub === "help" || sub === "--help" || flags.help) {
    console.log(HELP);
    return;
  }

  switch (sub) {
    case "list":
      await listCommand();
      break;
    case "show":
      await showCommand(positional[1]);
      break;
    case "pitch":
      await pitchCommand({
        persona: positional[1],
        docPath: positional[2],
        flags,
      });
      break;
    case "panel":
      await panelCommand({
        personas: positional[1],
        docPath: positional[2],
        flags,
      });
      break;
    case "sessions":
      await sessionsCommand();
      break;
    case "resume":
      await resumeCommand(positional[1], flags);
      break;
    default:
      console.error(`Unknown command: ${sub}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`\n[arena] ${err.message}`);
  process.exit(1);
});

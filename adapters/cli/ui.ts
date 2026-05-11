/**
 * UI helpers for the CLI surface — theatrical banner style.
 * All chrome respects no-TTY pipes (drops ANSI codes when not interactive).
 */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";

const isTTY = (): boolean => Boolean(process.stdout.isTTY);

function color(s: string, ...codes: string[]): string {
  return isTTY() ? `${codes.join("")}${s}${RESET}` : s;
}

export const ui = {
  bold: (s: string) => color(s, BOLD),
  dim: (s: string) => color(s, DIM),
  italic: (s: string) => color(s, ITALIC),
};

const BANNER_LINES = [
  "  ╔════════════════════════════════════╗",
  "  ║       T H E   A R E N A            ║",
  "  ╚════════════════════════════════════╝",
];

export function banner(): void {
  console.log("");
  for (const line of BANNER_LINES) console.log(ui.dim(line));
  console.log("");
}

export interface PersonaSummary {
  name: string;
  short: string;
}

export interface SessionHeader {
  mode: "pitch" | "panel" | "resume";
  personas: PersonaSummary[];
  doc: { path: string; size: number };
  runner: { name: string; model?: string };
  session: string;
  rounds?: number;
  priorTurns?: number;
}

function shortFromShort(short: string): string {
  // First clause before em-dash or first hyphen-dash, e.g. "Sequoia partner — markets-first…" → "Sequoia partner"
  const m = short.split(/\s+[—–-]\s+/)[0];
  return m.trim();
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} b`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kb`;
  return `${(b / 1024 / 1024).toFixed(1)} mb`;
}

function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

export function header(h: SessionHeader): void {
  const arrow = ui.bold("▸");
  const usingPlan = h.runner.name === "claude" || h.runner.name === "codex";

  const personaLine =
    h.mode === "panel"
      ? `${arrow} Panel       ${h.personas
          .map((p) => ui.bold(p.name))
          .join(ui.dim("  ·  "))}`
      : `${arrow} Persona     ${ui.bold(h.personas[0].name)} ${ui.dim(
          `(${shortFromShort(h.personas[0].short)})`,
        )}`;

  const docLine = `${arrow} Pitch       ${basename(h.doc.path)} ${ui.dim(
    `(${formatBytes(h.doc.size)})`,
  )}`;

  const runnerBadge = usingPlan
    ? `${h.runner.name} ${ui.dim("· your plan")}`
    : h.runner.name;
  const runnerLine = `${arrow} Runner      ${runnerBadge}${
    h.runner.model ? ui.dim(`  ·  ${h.runner.model}`) : ""
  }`;

  const sessionLine = `${arrow} Session     ${ui.dim(h.session)}`;

  console.log(`  ${personaLine}`);
  console.log(`  ${docLine}`);
  console.log(`  ${runnerLine}`);
  console.log(`  ${sessionLine}`);
  if (h.rounds) console.log(`  ${arrow} Rounds      ${h.rounds}`);
  if (h.priorTurns !== undefined)
    console.log(`  ${arrow} Resuming    ${h.priorTurns} prior message${h.priorTurns === 1 ? "" : "s"}`);
  console.log("");
}

export function entrance(
  personaName: string,
  portrait?: string,
  action = "enters the room",
): void {
  if (portrait) {
    // Portrait card is self-announcing — name lives inside the box.
    for (const line of portrait.split("\n")) console.log(line);
    console.log("");
  } else {
    // No portrait — fall back to a theatrical rule.
    const rule = ui.dim("━━━");
    console.log(`  ${rule} ${ui.bold(personaName)} ${ui.dim(action)} ${rule}\n`);
  }
}

export function roundHeader(roundNumber: number, label: string): void {
  const rule = ui.dim("═".repeat(36));
  console.log(`\n  ${rule}`);
  console.log(`  ${ui.bold(`ROUND ${roundNumber}`)}  ${ui.dim("·")}  ${ui.italic(label)}`);
  console.log(`  ${rule}\n`);
}

export function panelClose(): void {
  const rule = ui.dim("━".repeat(36));
  console.log(`\n  ${rule}\n`);
}

export function prompt(): string {
  return `  ${ui.bold("▸")} `;
}

export function replHelp(): void {
  console.log(
    "  " +
      ui.dim("/done · final verdict   /save · checkpoint   /exit · leave"),
  );
  console.log("");
}

export function farewell(sessionId: string, suggestResume = true): void {
  const rule = ui.dim("━".repeat(36));
  console.log(`\n  ${rule}`);
  console.log(`  ${ui.dim("session saved")}  ${ui.bold(sessionId)}`);
  if (suggestResume) {
    console.log(`  ${ui.dim("continue with")}  arena resume ${sessionId}`);
  }
  console.log(`  ${rule}\n`);
}

export function panelSaved(sessionId: string): void {
  const rule = ui.dim("━".repeat(36));
  console.log(`\n  ${rule}`);
  console.log(`  ${ui.dim("transcript saved")}  ${ui.bold(sessionId)}`);
  console.log(`  ${rule}\n`);
}

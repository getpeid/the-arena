import { listSessions } from "../sessions.ts";

export async function sessionsCommand(): Promise<void> {
  const sessions = listSessions();
  if (sessions.length === 0) {
    console.log("No sessions yet.");
    return;
  }
  console.log("Saved sessions (most recent first):\n");
  for (const s of sessions) {
    const turns =
      s.type === "pitch" ? `${Math.floor(s.messages.length / 2)} turns` : "panel transcript";
    console.log(`  ${s.id}`);
    console.log(`    type:     ${s.type}`);
    console.log(`    personas: ${s.personas.join(", ")}`);
    console.log(`    doc:      ${s.docPath}`);
    console.log(`    runner:   ${s.runner}${s.model ? `/${s.model}` : ""}`);
    console.log(`    updated:  ${s.updatedAt}`);
    console.log(`    ${turns}\n`);
  }
}

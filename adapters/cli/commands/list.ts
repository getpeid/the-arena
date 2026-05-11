import { listPersonas } from "../../../core/personas.ts";

export async function listCommand(): Promise<void> {
  const personas = await listPersonas();
  if (personas.length === 0) {
    console.log("No personas found. Drop a markdown file with frontmatter into ~/.arena/personas/");
    return;
  }
  console.log("Available personas:\n");
  for (const p of personas) {
    const tag = p.source === "user" ? " (yours)" : "";
    console.log(`  ${p.slug.padEnd(20)} ${p.name}${tag}`);
    console.log(`  ${" ".repeat(20)} ${p.short}\n`);
  }
}

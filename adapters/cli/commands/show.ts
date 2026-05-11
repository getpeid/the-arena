import { loadPersona } from "../../../core/personas.ts";

export async function showCommand(slug: string | undefined): Promise<void> {
  if (!slug) throw new Error("Usage: arena show <persona>");
  const p = await loadPersona(slug);
  console.log(`# ${p.name}\n`);
  console.log(`slug:    ${p.slug}`);
  console.log(`source:  ${p.source}`);
  console.log(`short:   ${p.short}`);
  console.log(`verdict: ${p.verdict}\n`);
  console.log("---\n");
  console.log(p.body);
}

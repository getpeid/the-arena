import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export interface Persona {
  slug: string;
  name: string;
  short: string;
  verdict: string;
  body: string;
  source: "builtin" | "user";
  portrait?: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILTIN_DIR = join(__dirname, "personas");
const USER_DIR = join(homedir(), ".arena", "personas");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Persona file missing YAML frontmatter delimiters (---)");
  }
  const [, frontmatter, body] = match;
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, body: body.trim() };
}

async function readPersonaFile(path: string, source: "builtin" | "user"): Promise<Persona> {
  const raw = await readFile(path, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  for (const required of ["name", "slug", "short", "verdict"]) {
    if (!meta[required]) {
      throw new Error(`Persona at ${path} missing required frontmatter field: ${required}`);
    }
  }

  let portrait: string | undefined;
  if (meta.portrait) {
    const portraitPath = join(dirname(path), meta.portrait);
    try {
      portrait = (await readFile(portraitPath, "utf8")).replace(/\n+$/, "");
    } catch {
      // Portrait file missing — non-fatal, persona still loads without it.
    }
  }

  return {
    slug: meta.slug,
    name: meta.name,
    short: meta.short,
    verdict: meta.verdict,
    body,
    source,
    portrait,
  };
}

async function listDir(dir: string, source: "builtin" | "user"): Promise<Persona[]> {
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const personas: Persona[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    try {
      personas.push(await readPersonaFile(join(dir, file), source));
    } catch (err) {
      console.error(`[arena] skipping ${file}: ${(err as Error).message}`);
    }
  }
  return personas;
}

export async function listPersonas(): Promise<Persona[]> {
  const builtin = await listDir(BUILTIN_DIR, "builtin");
  const user = await listDir(USER_DIR, "user");
  // User personas with the same slug override builtin.
  const map = new Map<string, Persona>();
  for (const p of builtin) map.set(p.slug, p);
  for (const p of user) map.set(p.slug, p);
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPersona(slugOrAlias: string): Promise<Persona> {
  const all = await listPersonas();
  const target = slugOrAlias.toLowerCase();
  const exact = all.find((p) => p.slug.toLowerCase() === target);
  if (exact) return exact;
  const fuzzy = all.find(
    (p) =>
      p.slug.toLowerCase().includes(target) ||
      p.name.toLowerCase().includes(target) ||
      p.name.toLowerCase().split(" ")[0] === target,
  );
  if (fuzzy) return fuzzy;
  const available = all.map((p) => p.slug).join(", ");
  throw new Error(`No persona matched "${slugOrAlias}". Available: ${available}`);
}

export async function loadPersonas(slugs: string[]): Promise<Persona[]> {
  return Promise.all(slugs.map((s) => loadPersona(s)));
}

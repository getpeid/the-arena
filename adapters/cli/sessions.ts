import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ChatMessage } from "./runners/index.ts";

export interface PitchSession {
  id: string;
  type: "pitch" | "panel";
  personas: string[];
  docPath: string;
  createdAt: string;
  updatedAt: string;
  runner: string;
  model?: string;
  hostSessionId?: string;
  messages: ChatMessage[];
}

const SESSIONS_DIR = join(homedir(), ".arena", "sessions");

function ensureDir(): void {
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
}

export function newSessionId(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${date}_${rand}`;
}

export function saveSession(s: PitchSession): void {
  ensureDir();
  s.updatedAt = new Date().toISOString();
  writeFileSync(join(SESSIONS_DIR, `${s.id}.json`), JSON.stringify(s, null, 2));
}

export function loadSession(id: string): PitchSession {
  const path = join(SESSIONS_DIR, `${id}.json`);
  if (!existsSync(path)) throw new Error(`Session not found: ${id}`);
  return JSON.parse(readFileSync(path, "utf8")) as PitchSession;
}

export function listSessions(): PitchSession[] {
  ensureDir();
  return readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(SESSIONS_DIR, f), "utf8")) as PitchSession)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

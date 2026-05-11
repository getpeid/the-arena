#!/usr/bin/env node
// MCP server entry — same shim pattern as arena.js.
import { register } from "tsx/esm/api";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register();
await import(pathToFileURL(resolve(here, "../adapters/mcp/server.ts")).href);

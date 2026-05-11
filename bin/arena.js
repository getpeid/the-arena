#!/usr/bin/env node
// Thin shim — registers tsx's ESM loader so the .ts source runs directly.
// Lets us ship a single codebase that works for `arena` (global install) AND
// for `tsx adapters/cli/index.ts` (local dev), without a compile step.
import { register } from "tsx/esm/api";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register();
await import(pathToFileURL(resolve(here, "../adapters/cli/index.ts")).href);

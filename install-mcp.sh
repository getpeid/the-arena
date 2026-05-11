#!/usr/bin/env bash
# install-mcp.sh, register arena as an MCP server in Claude Desktop.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/getpeid/the-arena/main/install-mcp.sh | bash
#
# After running, restart Claude Desktop. Then in any conversation, ask in
# plain English: "Have Doug Leone react to my pitch at <path>".
#
# Requires: python3 (pre-installed on macOS/Linux) and npx (comes with Node 20+).

set -euo pipefail

# Per-OS config path.
case "$(uname -s)" in
  Darwin*)
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    ;;
  Linux*)
    CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/Claude"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    CONFIG_DIR="${APPDATA:-$HOME/AppData/Roaming}/Claude"
    ;;
  *)
    echo "[arena] Unsupported OS. Edit claude_desktop_config.json by hand." >&2
    exit 1
    ;;
esac

CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
mkdir -p "$CONFIG_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[arena] python3 not found. Install Python 3 and retry." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "[arena] npx not found. Install Node 20+ from https://nodejs.org and retry." >&2
  exit 1
fi

python3 - "$CONFIG_FILE" <<'PY'
import json
import os
import sys

path = sys.argv[1]
config = {}
if os.path.exists(path) and os.path.getsize(path) > 0:
    with open(path) as f:
        try:
            config = json.load(f)
        except json.JSONDecodeError:
            print(f"[arena] {path} exists but is not valid JSON. Fix it or delete it, then re-run.", file=sys.stderr)
            sys.exit(1)

config.setdefault("mcpServers", {})["arena"] = {
    "command": "npx",
    "args": ["-y", "the-arena", "arena-mcp"],
}

with open(path, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")

print(f"[arena] Added arena MCP server to {path}")
PY

cat <<'EOM'

  arena MCP server installed.

  Restart Claude Desktop. Then in any conversation, try:

    "Have Doug Leone react to my pitch at <path>"
    "Run a panel of Doug, Masa, and Travis on my deck"
    "Show me the pitch personas available"

  Inference comes from your Claude Pro/Max plan, no API key required.

EOM

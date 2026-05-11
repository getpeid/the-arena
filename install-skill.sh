#!/usr/bin/env bash
# install-skill.sh, install the arena Claude Code skill in one command.
#
# Run via:
#   curl -fsSL https://raw.githubusercontent.com/getpeid/the-arena/main/install-skill.sh | bash
#
# What it does: clones the repo to ~/.arena/the-arena (or pulls latest),
# then symlinks adapters/skill into ~/.claude/skills/arena.
# After this, `/arena pitch <persona> <doc>` works in Claude Code.

set -euo pipefail

REPO_URL="https://github.com/getpeid/the-arena.git"
ARENA_DIR="${HOME}/.arena/the-arena"
SKILLS_DIR="${HOME}/.claude/skills"
SKILL_LINK="${SKILLS_DIR}/arena"

if ! command -v git >/dev/null 2>&1; then
  echo "[arena] git is required. Install: https://git-scm.com/downloads" >&2
  exit 1
fi

mkdir -p "$(dirname "$ARENA_DIR")"
mkdir -p "$SKILLS_DIR"

if [ -d "$ARENA_DIR/.git" ]; then
  echo "[arena] updating existing clone at $ARENA_DIR"
  git -C "$ARENA_DIR" pull --ff-only
else
  echo "[arena] cloning $REPO_URL → $ARENA_DIR"
  git clone --depth 1 "$REPO_URL" "$ARENA_DIR"
fi

if [ -L "$SKILL_LINK" ] || [ -e "$SKILL_LINK" ]; then
  echo "[arena] $SKILL_LINK already exists, removing"
  rm -rf "$SKILL_LINK"
fi

ln -s "$ARENA_DIR/adapters/skill" "$SKILL_LINK"
echo "[arena] symlinked $SKILL_LINK → $ARENA_DIR/adapters/skill"

cat <<'DONE'

  installed.

  In Claude Code, try:

    /arena list
    /arena pitch doug <path/to/your/pitch.md>
    /arena panel doug,masa,travis <path/to/your/pitch.md>

  Or just describe it: "Have Doug react to my pitch at <path>"

DONE

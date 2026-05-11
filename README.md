# the-arena

**Agentic pitch review.** A panel of legendary-investor agents in your terminal.

```bash
arena pitch doug ./pitch.md                # 1-on-1 with Doug Leone
arena panel doug,masa,travis ./pitch.md    # all three at once — they argue
```

Three founder-agents baked in. Each one is built from deep research — public talks, podcasts, partner letters, on-stage interviews — and holds its own worldview, asks its own questions, and delivers a verdict in its own native shape.

> **Doug Leone** · *Sequoia*
> *"Where's the unit economics? Who specifically is buying this?"*
> Markets-first. Demands a named buyer, a real moat, structural switching costs. Grades on a letter scale and tracks improvement across rounds.

> **Masayoshi Son** · *SoftBank*
> *"I look for shining eyes. If I need more than ten minutes, the answer is no."*
> Decides fast, thinks in 300-year arcs, tells you to add a zero. Asks one question: "Can this be #1?"

> **Travis Kalanick** · *Atoms (ex-Uber)*
> *"Specialized, not humanoid. Fear is the disease. Hustle is the antidote."*
> Operator-builder. Applies the derivative test. Won't capitulate to be polite. Tells you what to ship this week, not next quarter.

**Panel mode is the differentiator.** Doug demands the unit economics, Masa pushes you to add a zero, Travis tells you to ship before the math is clean. They engage with each other — agree, disagree, push back — and each delivers a verdict in their own native shape (Doug's letter grade, Masa's yes / no / 10x, Travis's Y/N + derivative test). The conflict between worldviews is what you came for.

**No API key required.** `arena` auto-shells to `claude -p` or `codex exec`, so tokens come out of your Claude Pro/Max or ChatGPT plan — not a separate API budget.

**Bring your own agent.** Drop a markdown file at `~/.arena/personas/<slug>.md` with a frontmatter header and a profile body. Pitch to your CEO, your most ruthless advisor, or the partner you're about to walk into a room with. `arena list` picks it up automatically.

## Install — pick your surface

### As a terminal CLI

```bash
npm install -g the-arena
```

Then anywhere:

```bash
arena pitch doug ./pitch.md
```

By default `arena` shells out to `claude -p` (your Claude Pro/Max plan) — no API key needed. It auto-detects `claude`, `codex`, or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`. See [Runners](#runners) below.

### As a Claude Code skill

```bash
curl -fsSL https://raw.githubusercontent.com/getpeid/the-arena/main/install-skill.sh | bash
```

Then in Claude Code: `/arena pitch doug ./pitch.md` — or just ask in natural language ("have Doug react to this pitch"). Claude Code's own session does the inference; nothing to configure.

### As an MCP server

Add to your MCP host config (Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "arena": {
      "command": "npx",
      "args": ["-y", "the-arena", "arena-mcp"]
    }
  }
}
```

Restart the host. The `pitch`, `panel`, `list_personas`, and `show_persona` tools become callable. The host's own session pays for inference.

### Via ClawHub (OpenClaw)

```bash
clawhub install arena
```

## Runners

### Use your existing plan, not your API budget

`arena` doesn't require an API key. It auto-detects an LLM runner you already pay for:

| Runner          | How it works                                             | Billing                  |
| --------------- | -------------------------------------------------------- | ------------------------ |
| `claude`        | Shells out to `claude -p` (Claude Code).                 | Your Claude Pro/Max plan |
| `codex`         | Shells out to `codex exec` (OpenAI Codex CLI).           | Your ChatGPT plan        |
| `anthropic-sdk` | Direct Anthropic API call.                               | `ANTHROPIC_API_KEY`      |
| `openai-sdk`    | Direct OpenAI API call.                                  | `OPENAI_API_KEY`         |

**Resolution order** (first match wins):

1. `--runner <name>` flag
2. `ARENA_RUNNER` env var
3. `runner` field in `~/.arena/config.json`
4. Auto-detect: `claude` installed → `ANTHROPIC_API_KEY` → `codex` installed → `OPENAI_API_KEY`

If you have Claude Code installed and logged in (`claude login`), `arena pitch doug ./pitch.md` Just Works — no API key, billed against your plan.

## Install

```bash
bun install -g the-arena       # or npm install -g
```

Optionally configure defaults:

```json
// ~/.arena/config.json
{
  "runner": "claude",
  "model": "claude-opus-4-7",
  "maxTokens": 2048
}
```

Defaults track SOTA: `claude-opus-4-7` for Anthropic, `gpt-5.5` for OpenAI.

## Commands

```bash
arena list                                  # show available personas
arena show <persona>                        # print the full profile
arena pitch <persona> <doc>                 # 1-on-1, interactive REPL
arena panel <p1,p2,p3> <doc>                # one-shot panel debate
arena panel <...> --rounds 3                # how many engagement rounds (default 2)
arena sessions                              # list saved sessions
arena resume <session-id>                   # continue a saved 1-on-1
```

Sessions persist as JSON in `~/.arena/sessions/` so you can iterate on a pitch and watch your Doug grade improve across versions.

Inside a pitch REPL:

```
/done       ask for the final verdict
/save       checkpoint without exiting
/exit       leave (session stays saved)
```

## Hosts

The CLI is the primary surface, but the persona library is reusable. Three adapters in `adapters/` share `core/`:

| Adapter        | Surface                                    | Inference billed to                |
| -------------- | ------------------------------------------ | ---------------------------------- |
| `cli/`         | `arena …` in your terminal                 | `claude` / `codex` plan, or API    |
| `mcp/`         | MCP host (Claude Desktop, Cursor, etc.)    | The host's session                 |
| `skill/`       | `/arena …` in Claude Code or ClawHub agent | The host's session                 |

### MCP server (Claude Desktop, Cursor, any MCP host)

Add to your host's MCP config (Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "arena": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/the-arena/adapters/mcp/server.ts"]
    }
  }
}
```

Or with bun:

```json
{
  "mcpServers": {
    "arena": {
      "command": "bunx",
      "args": ["the-arena/adapters/mcp/server.ts"]
    }
  }
}
```

Restart the host. The `list_personas`, `show_persona`, `pitch`, and `panel` tools become available. Ask "Have Doug Leone react to this pitch:" and the host will call the `pitch` tool and continue the conversation in character.

### Claude Code skill

Copy or symlink the skill bundle:

```bash
ln -s /path/to/the-arena/adapters/skill ~/.claude/skills/arena
```

Then in Claude Code: `/arena pitch doug ./pitch.md` or `/arena panel doug,masa,travis ./pitch.md`.

The skill is self-contained — its `personas/` directory is synced from `core/personas/` (run `npm run sync-skill-personas` after editing the originals).

### ClawHub (OpenClaw)

Publish the skill bundle:

```bash
npm run sync-skill-personas
clawhub skill publish adapters/skill
```

Users install with `clawhub install arena`.

## Adding a persona

Drop a markdown file at `~/.arena/personas/<slug>.md`:

```markdown
---
name: Your Persona Name
slug: your-slug
short: One-line description for `arena list`
verdict: How they deliver their final verdict (e.g., "letter grade A through F")
---

# Voice

[Full profile — biographical context, how they think, what they care about,
how they talk. The richer this is, the better the persona stays in character.]
```

`arena list` will pick it up automatically.

## License

MIT

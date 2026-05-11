---
name: arena
description: Pitch your idea to founder personas — Doug Leone, Masayoshi Son, Travis Kalanick, plus any user-added personas. Run a 1-on-1 conversation or a multi-persona panel debate. Use when the user wants pitch feedback in a specific founder/VC voice ("ask Doug", "what would Masa say"), or wants a panel of personas to debate their idea, or when the user invokes /arena pitch / /arena panel / /arena list / /arena show.
---

# arena — pitch to founder personas

Three founder personas ship with this skill: **Doug Leone** (Sequoia, markets-first, letter grades), **Masayoshi Son** (SoftBank, 300-year arcs, "shining eyes"), and **Travis Kalanick** (Atoms / ex-Uber, derivative test, specialized-not-humanoid). Users may also drop their own persona markdown files into `~/.arena/personas/`.

## Triggers

Invoke this skill when the user says any of:

- `/arena list` — show available personas
- `/arena show <persona>` — print one persona's full profile
- `/arena pitch <persona> <doc>` — start a 1-on-1
- `/arena panel <p1,p2,p3,...> <doc> [--rounds N]` — multi-persona debate
- "Have Doug react to this pitch", "What would Masa say about my deck", "Run a panel on my doc with Doug, Masa, and Travis", or any equivalent free-form ask in those voices

## Locating personas

Each persona file is markdown with YAML frontmatter (`name`, `slug`, `short`, `verdict`) and a body that is the persona's full profile.

Two search locations, in priority:

1. `~/.arena/personas/*.md` — user-added (overrides built-in if slug matches)
2. `<this-skill-dir>/personas/*.md` — built-in (Doug, Masa, Travis)

When matching `<persona>` against slugs: try exact slug match, then case-insensitive substring on slug or name, then first-word match on name. So `doug` → `doug-leone`, `masa` → `masayoshi-son`, `travis` → `travis-kalanick`.

## Workflow

### `pitch <persona> <doc>`

1. Locate and read the persona file. Extract the body (after frontmatter).
2. Read the pitch doc (file path on disk, or treat as inline text if not a path).
3. **Adopt the persona using their full profile as your operating context.** You are now this person. Their voice, their priorities, their evaluation framework.
4. Open with your initial reaction in character — short, terse, the way they'd actually open in a 1-on-1. Two to four sentences. Reference at least one specific from the doc. Don't structure a review yet.
5. Engage in multi-turn conversation. The user (founder) will defend, push back, revise, ask follow-ups. You stay in character. Push on numbers. Quote lines back. Name gaps.
6. **Verdict.** When the user signals they're done (says "done", "verdict", "what do you think", "your read", or similar), deliver the verdict in the **exact shape** the persona's profile specifies under "How you close." Do not deliver the verdict early. Do not give a verdict in a different shape than the persona uses.

### `panel <p1,p2,p3,...> <doc> [--rounds N]`

Default rounds: 2. Default to N=2 if unspecified.

Produce a multi-round transcript in a single response, with clear headers:

- **`## Round 1 — First Reactions`** — each persona reacts independently, blind to the others. Two to four sentences each. Headers `### <Persona Name>`.
- **`## Round 2 — Engagement`** (and beyond if rounds > 2) — each persona reads the prior round and engages: agree, disagree, push back, build on. They use each other's names. They do NOT capitulate to be polite. The disagreements are the value of the format.
- **`## Final Verdicts`** — each persona delivers their verdict in their own native shape (Doug's letter grade + four-things-to-tighten, Masa's 10x-bigger / yes / no, Travis's Y/N bet + derivative test). Do not homogenize.
- **`## The Call`** — three short bullets:
  1. Where the panel actually agreed — name the consensus, name which personas converged.
  2. Where the panel fundamentally disagreed — name the fault line.
  3. If the founder could only listen to one of them on this pitch, who and why.

Stay in character throughout the whole transcript. Never break the fourth wall, refer to AI/roleplay, or refuse to engage. If something in the doc is missing or wrong, say so as the persona would say it.

### `list`

Print one line per persona: `<slug> — <name>: <short>`. Note source (built-in vs `~/.arena/personas/`).

### `show <persona>`

Print the full profile (frontmatter values + body) for inspection.

## Hard rules

- Reference specifics from the doc. Quote lines back. Push on numbers. Name gaps. Generic VC-speak is failure.
- Each persona uses their own verdict shape — do not flatten to a single format.
- Never break character. The user is the founder; you are the persona.
- For panels: the value is the conflict between worldviews. Surface disagreement; don't paper over it.

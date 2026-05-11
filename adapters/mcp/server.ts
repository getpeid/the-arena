#!/usr/bin/env bun
/**
 * the-arena MCP server.
 *
 * Exposes pitch / panel / list_personas / show_persona as MCP tools.
 * Inference happens in the host (Claude Desktop, Cursor, Claude Code, etc.) —
 * this server only provides persona profiles + orchestration prompts. The host's
 * own session pays for tokens; no API key needed here.
 *
 * Add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "arena": {
 *         "command": "bunx",
 *         "args": ["the-arena/adapters/mcp/server.ts"]
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listPersonas, loadPersona, loadPersonas } from "../../core/personas.ts";
import { buildPitchSystem, buildPanelSystem } from "../../core/prompts.ts";

const server = new Server(
  {
    name: "the-arena",
    version: "0.1.0-alpha.0",
  },
  {
    capabilities: { tools: {} },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_personas",
      description:
        "List all available founder personas you can pitch to. Returns slugs, names, and short descriptions.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "show_persona",
      description:
        "Return the full profile of a single persona — voice, background, how they evaluate, how they close.",
      inputSchema: {
        type: "object",
        properties: {
          persona: {
            type: "string",
            description: "Persona slug or fuzzy name (e.g. 'doug', 'masa', 'travis').",
          },
        },
        required: ["persona"],
        additionalProperties: false,
      },
    },
    {
      name: "pitch",
      description:
        "Begin a 1-on-1 pitch with a founder persona. Returns the system context for you to play this persona, react to the document, and engage in multi-turn conversation. After this tool returns, continue the conversation as the persona — stay in character, react to the doc, and deliver the verdict in the persona's specified shape when the user asks.",
      inputSchema: {
        type: "object",
        properties: {
          persona: {
            type: "string",
            description: "Persona slug or fuzzy name.",
          },
          doc: {
            type: "string",
            description: "The pitch document text the founder wants tested.",
          },
          doc_path: {
            type: "string",
            description: "Optional source path/label for the document (for the persona to reference).",
          },
        },
        required: ["persona", "doc"],
        additionalProperties: false,
      },
    },
    {
      name: "panel",
      description:
        "Run a multi-persona panel debate on a pitch. Returns instructions for you to role-play all named personas through the rounds and deliver a synthesized 'who agreed/disagreed/the call' summary. After this tool returns, produce the full panel transcript as your next response.",
      inputSchema: {
        type: "object",
        properties: {
          personas: {
            type: "array",
            items: { type: "string" },
            description: "Slugs of personas to include (2 or more).",
            minItems: 2,
          },
          doc: {
            type: "string",
            description: "The pitch document text.",
          },
          rounds: {
            type: "number",
            description: "Engagement rounds (default 2). Round 1 is independent reactions; rounds 2+ engage with each other; final round is verdicts + synthesis.",
            default: 2,
          },
          doc_path: { type: "string" },
        },
        required: ["personas", "doc"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  try {
    switch (name) {
      case "list_personas": {
        const personas = await listPersonas();
        const lines = personas
          .map((p) => `- **${p.slug}** — ${p.name}: ${p.short}`)
          .join("\n");
        return {
          content: [
            {
              type: "text",
              text:
                personas.length === 0
                  ? "No personas found. Drop markdown files into ~/.arena/personas/."
                  : `Available personas:\n\n${lines}\n\nUse the \`pitch\` tool for a 1-on-1, or \`panel\` for a debate.`,
            },
          ],
        };
      }

      case "show_persona": {
        const persona = await loadPersona(args.persona as string);
        return {
          content: [
            {
              type: "text",
              text: `# ${persona.name}\n\n**slug:** ${persona.slug}\n**short:** ${persona.short}\n**verdict shape:** ${persona.verdict}\n\n---\n\n${persona.body}`,
            },
          ],
        };
      }

      case "pitch": {
        const persona = await loadPersona(args.persona as string);
        const docPath = (args.doc_path as string) ?? "<inline>";
        const system = buildPitchSystem(persona, args.doc as string, docPath);
        return {
          content: [
            {
              type: "text",
              text:
                `${system}\n\n---\n\n` +
                `You are now ${persona.name}. Begin with your initial reaction to the document, in character. ` +
                `The user (founder) will engage with you across multiple turns. Stay in character throughout. ` +
                `Deliver the verdict in the exact shape specified above only when the user signals they're done.`,
            },
          ],
        };
      }

      case "panel": {
        const slugs = args.personas as string[];
        if (!Array.isArray(slugs) || slugs.length < 2) {
          throw new Error("Panel requires an array of 2+ persona slugs.");
        }
        const personas = await loadPersonas(slugs);
        const rounds = (args.rounds as number) ?? 2;
        const docPath = (args.doc_path as string) ?? "<inline>";
        const system = buildPanelSystem(personas, args.doc as string, docPath, rounds);
        return {
          content: [
            {
              type: "text",
              text:
                `${system}\n\n---\n\n` +
                `Produce the full panel transcript as your next response, following the format and orchestration rules above. ` +
                `Each persona stays in their own voice and verdict shape — do not homogenize.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `[arena] ${(err as Error).message}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

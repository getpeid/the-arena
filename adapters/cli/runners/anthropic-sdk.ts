import Anthropic from "@anthropic-ai/sdk";
import type { InferOpts, InferResult, Runner, StreamEvent } from "./index.ts";

export class AnthropicSDKRunner implements Runner {
  readonly name = "anthropic-sdk" as const;
  readonly defaultModel = "claude-opus-4-7";
  readonly supportsStreaming = true;
  readonly supportsNativeResume = false;

  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async infer(opts: InferOpts): Promise<InferResult> {
    const res = await this.client.messages.create({
      model: opts.model ?? this.defaultModel,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return { text };
  }

  async *inferStream(opts: InferOpts): AsyncIterable<StreamEvent> {
    const stream = this.client.messages.stream({
      model: opts.model ?? this.defaultModel,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    let fullText = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
        yield { chunk: event.delta.text };
      }
    }
    yield { done: { text: fullText } };
  }
}

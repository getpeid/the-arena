import OpenAI from "openai";
import type { InferOpts, InferResult, Runner, StreamEvent } from "./index.ts";

export class OpenAISDKRunner implements Runner {
  readonly name = "openai-sdk" as const;
  readonly defaultModel = "gpt-5.5";
  readonly supportsStreaming = true;
  readonly supportsNativeResume = false;

  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  private buildMessages(opts: InferOpts) {
    return [
      { role: "system" as const, content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
  }

  async infer(opts: InferOpts): Promise<InferResult> {
    const res = await this.client.chat.completions.create({
      model: opts.model ?? this.defaultModel,
      messages: this.buildMessages(opts),
      max_tokens: opts.maxTokens ?? 2048,
    });
    return { text: res.choices[0]?.message?.content ?? "" };
  }

  async *inferStream(opts: InferOpts): AsyncIterable<StreamEvent> {
    const stream = await this.client.chat.completions.create({
      model: opts.model ?? this.defaultModel,
      messages: this.buildMessages(opts),
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        yield { chunk: delta };
      }
    }
    yield { done: { text: fullText } };
  }
}

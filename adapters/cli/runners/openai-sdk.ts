import OpenAI from "openai";
import type { InferOpts, InferResult, Runner, StreamEvent } from "./index.ts";

export class OpenAISDKRunner implements Runner {
  readonly name = "openai-sdk" as const;
  readonly defaultModel = "gpt-5.5";
  readonly supportsStreaming = true;
  readonly supportsNativeResume = false;

  private client: OpenAI;

  constructor() {
    // OPENAI_BASE_URL lets users point at any OpenAI-compatible endpoint:
    // Doubao, Kimi (Moonshot), DeepSeek, Qwen, GLM (ZhipuAI), Yi, Mistral,
    // Groq, Together, self-hosted vLLM, etc. OPENAI_API_KEY is still required.
    const baseURL = process.env.OPENAI_BASE_URL ?? process.env.OPENAI_API_BASE;
    this.client = new OpenAI(baseURL ? { baseURL } : {});
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

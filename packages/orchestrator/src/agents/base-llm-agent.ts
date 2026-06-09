import type { AgentInput, AgentOutput } from "@floras/shared";
import { eventBus } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";
import OpenAI from "openai";
import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ============================================================
// Base LLM Agent — extends BaseAgent with LLM + streaming
// ============================================================

export abstract class BaseLLMAgent extends BaseAgent {
  constructor(
    protected client: OpenAI,
    protected model: string,
    protected options: { temperature?: number; maxTokens?: number } = {}
  ) {
    super();
  }

  /** The system prompt that defines this agent's persona and task */
  abstract readonly systemPrompt: string;

  /** Zod schema for the agent's structured output */
  abstract readonly outputSchema: ZodType;

  /** Build the user message from the AgentInput context */
  abstract buildUserMessage(input: AgentInput): string;

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { runId } = input;
    logger.info(`Calling LLM (${this.model})`);

    try {
      const jsonSchema = zodToJsonSchema(this.outputSchema, "output");

      const stream = await this.client.chat.completions.create({
        model: this.model,
        temperature: this.options.temperature ?? 0.3,
        max_tokens: this.options.maxTokens ?? 4000,
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: this.buildUserMessage(input) },
        ],
        response_format: {
          type: "json_object",
        },
        stream: true,
      });

      let fullContent = "";
      let lastEmitTime = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;

          // Emit a stream update at most every 80ms to avoid flooding
          const now = Date.now();
          if (now - lastEmitTime > 80) {
            lastEmitTime = now;
            eventBus.emit({
              type: "agent_stream",
              data: {
                runId,
                agentId: this.id,
                content: fullContent,
                done: false,
              },
            });
          }
        }
      }

      // Emit final stream chunk
      eventBus.emit({
        type: "agent_stream",
        data: {
          runId,
          agentId: this.id,
          content: fullContent,
          done: true,
        },
      });

      if (!fullContent.trim()) {
        throw new Error("Empty LLM response");
      }

      const parsed = this.outputSchema.safeParse(JSON.parse(fullContent));
      if (!parsed.success) {
        logger.error("LLM output failed validation", {
          issues: parsed.error.issues,
        });
        throw new Error(
          `Output validation failed: ${parsed.error.message}`
        );
      }

      logger.info(
        `LLM call complete (${fullContent.length} chars, ~${Math.round(fullContent.length / 3.5)} tokens)`
      );

      return { success: true, data: parsed.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`LLM call failed: ${message}`);
      return { success: false, data: null, error: message };
    }
  }
}

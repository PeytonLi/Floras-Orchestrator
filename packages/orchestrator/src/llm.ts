import OpenAI from "openai";

// ============================================================
// LLM configuration + client factory
// DeepSeek is the default provider (OpenAI-compatible API)
// ============================================================

export interface LLMConfig {
  enabled: boolean;
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export function loadLLMConfig(): LLMConfig {
  return {
    enabled: process.env.LLM_ENABLED !== "false",
    provider: process.env.LLM_PROVIDER ?? "deepseek",
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "deepseek-chat",
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
    temperature: process.env.LLM_TEMPERATURE
      ? Number(process.env.LLM_TEMPERATURE)
      : 0.3,
    maxTokens: process.env.LLM_MAX_TOKENS
      ? Number(process.env.LLM_MAX_TOKENS)
      : 4000,
  };
}

export function createClient(config: LLMConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: 120000,
  });
}

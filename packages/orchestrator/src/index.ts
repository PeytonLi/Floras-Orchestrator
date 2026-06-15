export { PipelineEngine, engine } from "./engine";
export { createLogger } from "./logger";
export type { Logger } from "./logger";
export {
  BaseAgent,
  BaseLLMAgent,
  SalesIntelAgent,
  ProjectAdvisorAgent,
  CO2EstimatorAgent,
  DesignSystemAgent,
  SalesIntelStubAgent,
  ProjectAdvisorStubAgent,
  CO2EstimatorStubAgent,
  DesignSystemStubAgent,
  ExternalHttpAgent,
} from "./agents";
export type { FlorasAgent, ExternalAgentOptions } from "./agents";
export { loadLLMConfig, createClient } from "./llm";
export type { LLMConfig } from "./llm";
// Registry + declarative pipeline (the "add an agent without rebuilding" API)
export { AgentRegistry } from "./registry";
export type { AgentMeta, RegisteredAgent } from "./registry";
export {
  DEFAULT_PIPELINE,
  BUILTIN_AGENT_META,
} from "./pipeline-def";
export type { PipelineStep, GateSpec } from "./pipeline-def";

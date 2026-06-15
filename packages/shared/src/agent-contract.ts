import type { PipelineContext, AgentConfig, AgentOutput } from "./types";
import type { IntakeForm } from "./kb/schema";

// ============================================================
// External Agent Contract
//
// The typed wire format the orchestrator and a remote agent (e.g.
// another team's OpenCode agent) agree on. The request carries the
// same data an in-process agent receives; the response reuses
// AgentOutput so internal and external agents are interchangeable.
// ============================================================

export interface AgentRequestEnvelope {
  /** The pipeline run this call belongs to */
  runId: string;
  /** Which agent slot is being invoked */
  agentId: string;
  /** The original user prompt */
  prompt: string;
  /** Data accumulated so far in the pipeline */
  context: PipelineContext;
  /** Optional structured customer intake */
  intake?: IntakeForm;
  /** Optional retry/timeout policy hint */
  config?: Partial<AgentConfig>;
}

/** Remote agents return the same shape internal agents do */
export type AgentResponseEnvelope = AgentOutput;

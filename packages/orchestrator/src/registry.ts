import type { PipelineContext, PipelineStage } from "@floras/shared";
import type { FlorasAgent } from "./agents/base-agent";

// ============================================================
// Agent Registry
//
// Decouples "which agent runs" from the engine's control flow.
// Adding a new agent = register it here + add one step to the
// pipeline definition (pipeline-def.ts). No engine edits.
// ============================================================

export interface AgentMeta {
  /** Stable agent id, matches the id on the FlorasAgent instance */
  id: string;
  /** The work stage this agent runs in */
  stage: PipelineStage;
  /** Context keys this agent reads (informational + future validation) */
  reads: (keyof PipelineContext)[];
  /** Context keys this agent writes */
  writes: (keyof PipelineContext)[];
}

export interface RegisteredAgent {
  meta: AgentMeta;
  agent: FlorasAgent;
}

export class AgentRegistry {
  private agents = new Map<string, RegisteredAgent>();

  /** Register (or replace) an agent under its meta.id */
  register(meta: AgentMeta, agent: FlorasAgent): this {
    this.agents.set(meta.id, { meta, agent });
    return this;
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  get(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  /** Resolve just the agent instance for execution */
  getAgent(id: string): FlorasAgent | undefined {
    return this.agents.get(id)?.agent;
  }

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  ids(): string[] {
    return Array.from(this.agents.keys());
  }
}

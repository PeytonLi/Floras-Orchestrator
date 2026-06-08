import type { AgentInput, AgentOutput, AgentStatus } from "@floras/shared";
import type { Logger } from "../logger";

// ============================================================
// Base agent interface + abstract class
// ============================================================

export interface FlorasAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  /** Execute the agent's work. Must be idempotent for retries. */
  execute(input: AgentInput, logger: Logger): Promise<AgentOutput>;

  /** Current status of this agent instance */
  getStatus(): AgentStatus;
}

export abstract class BaseAgent implements FlorasAgent {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;

  protected status: AgentStatus = "idle";

  getStatus(): AgentStatus {
    return this.status;
  }

  async run(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    this.status = "running";
    logger.info(`Starting ${this.name}`);

    try {
      const result = await this.execute(input, logger);
      this.status = result.success ? "done" : "error";
      if (result.success) {
        logger.info(`${this.name} completed successfully`);
      } else {
        logger.error(`${this.name} failed: ${result.error}`);
      }
      return result;
    } catch (err) {
      this.status = "error";
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`${this.name} threw: ${message}`);
      return { success: false, data: null, error: message };
    }
  }

  abstract execute(input: AgentInput, logger: Logger): Promise<AgentOutput>;
}

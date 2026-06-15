import type {
  AgentInput,
  AgentOutput,
  AgentStatus,
  AgentRequestEnvelope,
} from "@floras/shared";
import type { ZodType } from "zod";
import type { Logger } from "../logger";
import type { FlorasAgent } from "./base-agent";

// ============================================================
// External HTTP Agent
//
// A FlorasAgent that delegates to a remote endpoint (another team's
// OpenCode agent) over the shared AgentRequestEnvelope contract.
// Validates the remote payload with the same Zod schema as its
// internal twin, and falls back to a local agent when the endpoint
// is disabled or unreachable — so the pipeline never hard-fails on a
// remote outage. No live remote is required to register one.
// ============================================================

export interface ExternalAgentOptions {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  /** Optional Authorization header value, e.g. "Bearer xyz" */
  authHeader?: string;
  /** Validate the remote's `data` payload (reuse the internal twin's schema) */
  outputSchema?: ZodType;
  /** Local agent used when the endpoint is disabled or unreachable */
  fallback?: FlorasAgent;
  /** When false, always use the fallback (config-driven kill switch) */
  enabled?: boolean;
  timeoutMs?: number;
}

export class ExternalHttpAgent implements FlorasAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  private status: AgentStatus = "idle";

  constructor(private readonly opts: ExternalAgentOptions) {
    this.id = opts.id;
    this.name = opts.name;
    this.description =
      opts.description ?? `External agent at ${opts.endpoint}`;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    if (this.opts.enabled === false) {
      return this.runFallback(input, logger, "disabled");
    }

    this.status = "running";
    const envelope: AgentRequestEnvelope = {
      runId: input.runId,
      agentId: this.id,
      prompt: input.prompt,
      context: input.context,
      intake: input.intake,
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        this.opts.timeoutMs ?? 30_000,
      );
      let res: Response;
      try {
        res = await fetch(this.opts.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.opts.authHeader
              ? { Authorization: this.opts.authHeader }
              : {}),
          },
          body: JSON.stringify(envelope),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${this.opts.endpoint}`);
      }

      const body = (await res.json()) as AgentOutput;
      if (!body.success) {
        this.status = "error";
        return {
          success: false,
          data: null,
          error: body.error ?? "External agent reported failure",
        };
      }

      // Validate against the shared schema so remote hallucinations are
      // caught exactly like internal LLM output (triggers engine retry).
      if (this.opts.outputSchema) {
        const parsed = this.opts.outputSchema.safeParse(body.data);
        if (!parsed.success) {
          this.status = "error";
          return {
            success: false,
            data: null,
            error: `External output validation failed: ${parsed.error.message}`,
          };
        }
        this.status = "done";
        return { success: true, data: parsed.data };
      }

      this.status = "done";
      return { success: true, data: body.data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`External agent ${this.id} unreachable: ${msg}`);
      return this.runFallback(input, logger, msg);
    }
  }

  private async runFallback(
    input: AgentInput,
    logger: Logger,
    reason: string,
  ): Promise<AgentOutput> {
    if (!this.opts.fallback) {
      this.status = "error";
      return {
        success: false,
        data: null,
        error: `External agent ${this.id} ${reason} and no fallback configured`,
      };
    }
    logger.info(`Falling back to internal agent for ${this.id} (${reason})`);
    const out = await this.opts.fallback.execute(input, logger);
    this.status = this.opts.fallback.getStatus();
    return out;
  }
}

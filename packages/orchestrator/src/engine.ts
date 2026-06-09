import type {
  PipelineRun,
  PipelineStage,
  AgentState,
  AgentConfig,
  AgentOutput,
  RunInput,
  PipelineContext,
  GateDecision,
  GateEvent,
  Lead,
  Qualification,
  CO2Estimate,
  ProjectRecommendation,
  Artifact,
} from "@floras/shared";
import {
  eventBus,
  saveRun,
  saveContext,
  getContext,
  emptyContext,
  listRuns as listRunsFromNeo4j,
  checkConnection,
  ensureIndexes,
  saveLeads,
  saveQualifications,
  saveEstimates,
  saveRecommendations,
  saveArtifacts,
} from "@floras/shared";
import { createLogger } from "./logger";
import { SalesIntelAgent } from "./agents/sales-intel";
import { ProjectAdvisorAgent } from "./agents/project-advisor";
import { CO2EstimatorAgent } from "./agents/co2-estimator";
import { DesignSystemAgent } from "./agents/design-system";
import { SalesIntelStubAgent } from "./agents/sales-intel-stub";
import { ProjectAdvisorStubAgent } from "./agents/project-advisor-stub";
import { CO2EstimatorStubAgent } from "./agents/co2-estimator-stub";
import { DesignSystemStubAgent } from "./agents/design-system-stub";
import type { FlorasAgent } from "./agents/base-agent";
import { loadLLMConfig, createClient } from "./llm";

// ============================================================
// Pipeline Engine — state machine that drives runs
// ============================================================

/** Default retry / timeout policy applied to every agent unless overridden */
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxRetries: 2,
  backoffMs: 1000,
  timeoutMs: 30_000,
};

/** Valid transitions from each stage */
const TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  idle: ["discovering"],
  discovering: ["qualifying", "error"],
  qualifying: ["awaiting_approval", "error"],
  awaiting_approval: ["estimating", "error"],
  estimating: ["recommending", "error"],
  recommending: ["presenting", "error"],
  presenting: ["complete", "error"],
  complete: [],
  // Allow resuming from error into any agent-work stage
  error: ["idle", "discovering", "estimating", "recommending", "presenting"],
};

/** Pipeline stages in execution order (used for resume skip logic) */
const STAGE_ORDER: PipelineStage[] = [
  "discovering",
  "qualifying",
  "awaiting_approval",
  "estimating",
  "recommending",
  "presenting",
];

/** Stages that directly execute an agent (vs. gate / no-op transitions) */
const WORK_STAGES = new Set<PipelineStage>([
  "discovering",
  "estimating",
  "recommending",
  "presenting",
]);

/** Map stages to the agent that runs in them */
const STAGE_AGENTS: Partial<Record<PipelineStage, string>> = {
  discovering: "sales-intel",
  qualifying: "sales-intel", // qualification is part of sales intel output
  estimating: "co2-estimator",
  recommending: "project-advisor",
  presenting: "design-system",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PipelineEngine {
  private runs: Map<string, PipelineRun> = new Map();
  private gateResolvers: Map<string, (decision: GateDecision) => void> =
    new Map();
  private agents: Map<string, FlorasAgent>;
  private hydrated = false;
  private hydrationPromise: Promise<void> | null = null;

  constructor() {
    const llmConfig = loadLLMConfig();
    const llmEnabled = llmConfig.enabled && llmConfig.apiKey.length > 0;

    if (llmEnabled) {
      const client = createClient(llmConfig);
      const model = llmConfig.model;
      const llmOptions = {
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
      };

      this.agents = new Map<string, FlorasAgent>([
        ["sales-intel", new SalesIntelAgent(client, model, llmOptions)],
        ["project-advisor", new ProjectAdvisorAgent(client, model, llmOptions)],
        ["co2-estimator", new CO2EstimatorAgent(client, model, llmOptions)],
        ["design-system", new DesignSystemAgent(client, model, llmOptions)],
      ]);
      console.log(
        `[engine] LLM enabled — using ${llmConfig.provider} (${model})`,
      );
    } else {
      this.agents = new Map<string, FlorasAgent>([
        ["sales-intel", new SalesIntelStubAgent()],
        ["project-advisor", new ProjectAdvisorStubAgent()],
        ["co2-estimator", new CO2EstimatorStubAgent()],
        ["design-system", new DesignSystemStubAgent()],
      ]);
      console.log("[engine] LLM disabled — using stub agents");
    }

    // Kick off Neo4j connection check + lazy hydration on next tick.
    // Don't block the constructor — engine works fine in memory-only mode.
    this.hydrationPromise = this.initNeo4j();
  }

  // ----------------------------------------------------------
  // Neo4j bootstrap — hydrate in-memory state from graph
  // ----------------------------------------------------------

  private async initNeo4j(): Promise<void> {
    const connected = await checkConnection();
    if (!connected) return;

    await ensureIndexes().catch(() => {});
    await this.hydrateFromNeo4j();
  }

  /** Load all existing runs from Neo4j into the in‑memory map */
  private async hydrateFromNeo4j(): Promise<void> {
    try {
      const remoteRuns = await listRunsFromNeo4j();
      for (const run of remoteRuns) {
        if (!this.runs.has(run.id)) {
          this.runs.set(run.id, run);
        }
      }
      this.hydrated = true;
      console.log(`[engine] Hydrated ${remoteRuns.length} runs from Neo4j`);
    } catch (err) {
      console.warn(
        "[engine] Neo4j hydration failed — running in memory-only mode",
        err,
      );
    }
  }

  /** Ensure hydration has completed before returning data */
  private async ensureHydrated(): Promise<void> {
    if (this.hydrated || !this.hydrationPromise) return;
    try {
      await this.hydrationPromise;
    } catch {
      // Hydration failed; proceed with in‑memory state
    }
  }

  /** Create a new pipeline run */
  createRun(input: RunInput): PipelineRun {
    const now = new Date().toISOString();
    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const agentStates: Record<string, AgentState> = {};
    const agentConfigs: Record<string, AgentConfig> = {};
    for (const [agentId, agent] of this.agents) {
      agentStates[agentId] = {
        agentId,
        status: "idle",
        startedAt: null,
        completedAt: null,
        error: null,
        output: null,
      };
      agentConfigs[agentId] = { ...DEFAULT_AGENT_CONFIG };
    }

    const run: PipelineRun = {
      id,
      stage: "idle",
      previousStage: null,
      createdAt: now,
      updatedAt: now,
      input,
      error: null,
      agents: agentStates,
      agentConfigs,
    };

    this.runs.set(id, run);
    saveRun(run).catch(() => {}); // best-effort persist
    return run;
  }

  /**
   * Get a run by ID — read‑through cache.
   * Checks in‑memory first; if missing, triggers async Neo4j fetch.
   */
  getRun(runId: string): PipelineRun | undefined {
    const cached = this.runs.get(runId);
    if (cached) return cached;

    // Trigger async read‑through from Neo4j (available on next call)
    this.fetchAndCacheRun(runId);
    return undefined;
  }

  /** Async read‑through: load a run from Neo4j into the in‑memory cache */
  private async fetchAndCacheRun(runId: string): Promise<void> {
    try {
      await this.ensureHydrated();
      const { getRun: getRunFromNeo4j } = await import("@floras/shared");
      const run = await getRunFromNeo4j(runId);
      if (run && !this.runs.has(runId)) {
        this.runs.set(runId, run);
      }
    } catch {
      // Neo4j unavailable — run will remain undefined
    }
  }

  /** List all runs — merges in‑memory with Neo4j after hydration */
  listRuns(): PipelineRun[] {
    return Array.from(this.runs.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Override the retry / timeout policy for a specific agent on a run */
  setAgentConfig(
    runId: string,
    agentId: string,
    config: Partial<AgentConfig>,
  ): void {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (!run.agentConfigs[agentId]) {
      run.agentConfigs[agentId] = { ...DEFAULT_AGENT_CONFIG };
    }
    Object.assign(run.agentConfigs[agentId], config);
  }

  /** Transition to a new stage with validation */
  private async transition(run: PipelineRun, to: PipelineStage): Promise<void> {
    if (run.stage === to) return; // already there (e.g., after resume transition)

    const valid = TRANSITIONS[run.stage];
    if (!valid.includes(to)) {
      throw new Error(`Invalid transition: ${run.stage} → ${to}`);
    }

    const from = run.stage;
    run.previousStage = from;
    run.stage = to;
    run.updatedAt = new Date().toISOString();

    eventBus.emit({ type: "stage_change", data: { runId: run.id, from, to } });
    await saveRun(run).catch(() => {});
  }

  /** Update agent state and broadcast */
  private updateAgent(
    run: PipelineRun,
    agentId: string,
    update: Partial<AgentState>,
  ): void {
    const state = run.agents[agentId];
    if (!state) return;
    Object.assign(state, update);
    run.updatedAt = new Date().toISOString();

    if (update.status) {
      eventBus.emit({
        type: "agent_status",
        data: { runId: run.id, agentId, status: update.status },
      });
    }
  }

  /**
   * Persist domain entities as graph nodes after an agent stage completes.
   * Fire‑and‑forget — never blocks the pipeline.
   */
  private persistGraph(
    runId: string,
    entityType: string,
    saveFn: (runId: string, data: any) => Promise<void>,
    data: any,
  ): void {
    saveFn(runId, data).catch((err) => {
      console.error(`[engine] Failed to persist ${entityType} to graph:`, err);
    });
  }

  /**
   * Execute the full pipeline for a run.
   *
   * @param runId       - The run to execute
   * @param startFrom   - Optional stage to resume from (used by resumeRun)
   * @param initialCtx  - Pre-loaded context for resume (used by resumeRun)
   */
  async executeRun(
    runId: string,
    startFrom?: PipelineStage,
    initialCtx?: PipelineContext,
  ): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const log = createLogger(runId);
    const resume = startFrom !== undefined;
    let ctx: PipelineContext = initialCtx ?? emptyContext();

    /** Whether a stage should execute given an optional resume point */
    const shouldRun = (stage: PipelineStage): boolean => {
      if (!startFrom) return true;
      const startIdx = STAGE_ORDER.indexOf(startFrom);
      const stageIdx = STAGE_ORDER.indexOf(stage);
      return stageIdx >= startIdx;
    };

    try {
      // ============================================================
      // STAGE 1: Discovering + Qualifying
      // ============================================================
      if (shouldRun("discovering")) {
        log.info(resume ? "Resuming at discovery" : "Pipeline started");
        await this.transition(run, "discovering");

        const salesResult = await this.runAgentWithRetry(
          run,
          "sales-intel",
          ctx,
          log,
        );

        const salesData = salesResult.data as {
          leads: Lead[];
          qualifications: Qualification[];
        };
        ctx.leads = salesData.leads;
        ctx.qualifications = salesData.qualifications;
        this.updateAgent(run, "sales-intel", {
          status: "done",
          completedAt: new Date().toISOString(),
          output: salesData,
        });

        await saveContext(runId, ctx).catch(() => {});
        await this.transition(run, "qualifying");

        // Qualifying is implicit — sales intel already scored leads
        log.info("Qualification complete — moving to approval gate");
        await this.transition(run, "awaiting_approval");

        // --- HUMAN GATE ---
        log.info("Awaiting human approval to proceed");
        const gateSummary = ctx.leads
          .map((l) => {
            const q = ctx.qualifications.find((q) => q.leadId === l.id);
            return `${l.companyName} (score: ${q?.score ?? "N/A"})`;
          })
          .join(", ");

        const gateEvent: GateEvent = {
          runId,
          stage: "awaiting_approval",
          decision: "pending",
          decidedBy: null,
          decidedAt: null,
          summary: `Approve ${ctx.leads.length} qualified leads: ${gateSummary}`,
        };
        eventBus.emit({ type: "gate", data: gateEvent });

        const decision = await this.waitForGate(runId);
        if (decision === "rejected") {
          log.warn("Human rejected — pipeline stopped");
          await this.transition(run, "error");
          run.error = "Rejected by human reviewer";
          await saveRun(run).catch(() => {});
          return;
        }

        log.info("Human approved — continuing pipeline");
      }

      // ============================================================
      // STAGE 2: CO2 Estimation
      // ============================================================
      if (shouldRun("estimating")) {
        await this.transition(run, "estimating");

        const co2Result = await this.runAgentWithRetry(
          run,
          "co2-estimator",
          ctx,
          log,
        );

        const co2Data = co2Result.data as { estimates: CO2Estimate[] };
        ctx.estimates = co2Data.estimates;
        this.updateAgent(run, "co2-estimator", {
          status: "done",
          completedAt: new Date().toISOString(),
          output: co2Data,
        });
        await saveContext(runId, ctx).catch(() => {});
      }

      // ============================================================
      // STAGE 3: Project Recommendation
      // ============================================================
      if (shouldRun("recommending")) {
        await this.transition(run, "recommending");

        const advisorResult = await this.runAgentWithRetry(
          run,
          "project-advisor",
          ctx,
          log,
        );

        const advisorData = advisorResult.data as {
          recommendations: ProjectRecommendation[];
        };
        ctx.recommendations = advisorData.recommendations;
        this.updateAgent(run, "project-advisor", {
          status: "done",
          completedAt: new Date().toISOString(),
          output: advisorData,
        });
        await saveContext(runId, ctx).catch(() => {});
      }

      // ============================================================
      // STAGE 4: Presentation Generation
      // ============================================================
      if (shouldRun("presenting")) {
        await this.transition(run, "presenting");

        const designResult = await this.runAgentWithRetry(
          run,
          "design-system",
          ctx,
          log,
        );

        const designData = designResult.data as { artifacts: Artifact[] };
        ctx.artifacts = designData.artifacts;
        this.updateAgent(run, "design-system", {
          status: "done",
          completedAt: new Date().toISOString(),
          output: designData,
        });
        await saveContext(runId, ctx).catch(() => {});
      }

      // ============================================================
      // COMPLETE
      // ============================================================
      await this.transition(run, "complete");
      log.info("Pipeline completed successfully");
      eventBus.emit({ type: "run_complete", data: { runId } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.error = message;
      if (run.stage !== "error") {
        await this.transition(run, "error").catch(() => {
          run.stage = "error";
        });
      }
      log.error(`Pipeline failed: ${message}`);
      eventBus.emit({ type: "run_error", data: { runId, error: message } });
    }
  }

  /**
   * Resume a failed pipeline run from the last successful stage.
   * Restores saved context and picks up where it left off.
   *
   * @param runId       - The run to resume (must be in "error" stage)
   * @param targetStage - Optional explicit stage to resume from
   *                      (defaults to the stage that failed)
   */
  async resumeRun(runId: string, targetStage?: PipelineStage): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (run.stage !== "error") {
      throw new Error(
        `Run ${runId} is in stage "${run.stage}", not "error". Cannot resume.`,
      );
    }

    const log = createLogger(runId);

    // Determine the stage to resume from
    const resumeStage = targetStage ?? run.previousStage ?? "discovering";

    if (!WORK_STAGES.has(resumeStage)) {
      const list = Array.from(WORK_STAGES).join(", ");
      throw new Error(
        `Cannot resume to "${resumeStage}". Valid stages: ${list}`,
      );
    }

    log.info(`Resuming pipeline from stage "${resumeStage}"`);

    // Restore context accumulated before the failure
    const ctx = await getContext(runId);

    // Transition from error to the target stage, then execute from there
    await this.transition(run, resumeStage);
    eventBus.emit({
      type: "run_resumed",
      data: { runId, from: resumeStage },
    });

    await this.executeRun(runId, resumeStage, ctx);
  }

  /** Resolve a pending human gate */
  resolveGate(runId: string, decision: GateDecision): void {
    const resolver = this.gateResolvers.get(runId);
    if (resolver) {
      resolver(decision);
      this.gateResolvers.delete(runId);
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  /**
   * Run an agent with retry + timeout logic.
   * On failure, retries up to `maxRetries` times with linear backoff.
   * Throws only after all attempts are exhausted.
   */
  private async runAgentWithRetry(
    run: PipelineRun,
    agentId: string,
    ctx: PipelineContext,
    log: ReturnType<typeof createLogger>,
  ): Promise<AgentOutput> {
    const agent = this.agents.get(agentId)!;
    const config = run.agentConfigs[agentId] ?? DEFAULT_AGENT_CONFIG;
    const agentLog = createLogger(run.id, agentId);
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const isRetry = attempt > 0;
      this.updateAgent(run, agentId, {
        status: isRetry ? "retrying" : "running",
        startedAt: isRetry
          ? run.agents[agentId].startedAt // preserve original start time
          : new Date().toISOString(),
        error: null,
      });

      try {
        const result = await Promise.race([
          agent.execute(
            { runId: run.id, context: ctx, prompt: run.input.prompt },
            agentLog,
          ),
          new Promise<AgentOutput>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Agent "${agentId}" timed out after ${config.timeoutMs}ms`,
                  ),
                ),
              config.timeoutMs,
            ),
          ),
        ]);

        if (result.success) {
          return result;
        }

        lastError = result.error ?? "Unknown error";
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < config.maxRetries) {
        const delay = config.backoffMs * (attempt + 1);
        log.warn(
          `Agent ${agentId} failed (attempt ${attempt + 1}/${config.maxRetries + 1}), ` +
            `retrying in ${delay}ms: ${lastError}`,
        );
        eventBus.emit({
          type: "agent_retry",
          data: {
            runId: run.id,
            agentId,
            attempt: attempt + 1,
            error: lastError,
          },
        });
        await sleep(delay);
      }
    }

    // All retries exhausted — mark error and throw
    this.updateAgent(run, agentId, { status: "error", error: lastError });
    throw new Error(
      `${agentId} failed after ${config.maxRetries + 1} attempt(s): ${lastError}`,
    );
  }

  /** Wait for a human gate to be resolved */
  private waitForGate(runId: string): Promise<GateDecision> {
    return new Promise((resolve) => {
      this.gateResolvers.set(runId, resolve);
    });
  }
}

/** Singleton engine instance */
export const engine = new PipelineEngine();

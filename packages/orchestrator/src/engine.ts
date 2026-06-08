import type {
  PipelineRun,
  PipelineStage,
  AgentState,
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
import { eventBus, saveRun, saveContext, getContext, emptyContext } from "@floras/shared";
import { createLogger } from "./logger";
import { SalesIntelAgent } from "./agents/sales-intel";
import { ProjectAdvisorAgent } from "./agents/project-advisor";
import { CO2EstimatorAgent } from "./agents/co2-estimator";
import { DesignSystemAgent } from "./agents/design-system";
import type { FlorasAgent } from "./agents/base-agent";

// ============================================================
// Pipeline Engine — state machine that drives runs
// ============================================================

/** Valid transitions from each stage */
const TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  idle: ["discovering"],
  discovering: ["qualifying", "error"],
  qualifying: ["awaiting_approval", "error"],
  awaiting_approval: ["estimating", "error"], // after human approves
  estimating: ["recommending", "error"],
  recommending: ["presenting", "error"],
  presenting: ["complete", "error"],
  complete: [],
  error: ["idle"], // allow restart
};

/** Map stages to the agent that runs in them */
const STAGE_AGENTS: Partial<Record<PipelineStage, string>> = {
  discovering: "sales-intel",
  qualifying: "sales-intel", // qualification is part of sales intel output
  estimating: "co2-estimator",
  recommending: "project-advisor",
  presenting: "design-system",
};

export class PipelineEngine {
  private runs: Map<string, PipelineRun> = new Map();
  private gateResolvers: Map<string, (decision: GateDecision) => void> = new Map();
  private agents: Map<string, FlorasAgent>;

  constructor() {
    this.agents = new Map<string, FlorasAgent>([
      ["sales-intel", new SalesIntelAgent()],
      ["project-advisor", new ProjectAdvisorAgent()],
      ["co2-estimator", new CO2EstimatorAgent()],
      ["design-system", new DesignSystemAgent()],
    ]);
  }

  /** Create a new pipeline run */
  createRun(input: RunInput): PipelineRun {
    const now = new Date().toISOString();
    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const agentStates: Record<string, AgentState> = {};
    for (const [agentId, agent] of this.agents) {
      agentStates[agentId] = {
        agentId,
        status: "idle",
        startedAt: null,
        completedAt: null,
        error: null,
        output: null,
      };
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
    };

    this.runs.set(id, run);
    saveRun(run).catch(() => {}); // best-effort persist
    return run;
  }

  /** Get a run by ID */
  getRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  /** List all runs (in-memory) */
  listRuns(): PipelineRun[] {
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /** Transition to a new stage with validation */
  private async transition(run: PipelineRun, to: PipelineStage): Promise<void> {
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
    update: Partial<AgentState>
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

  /** Execute the full pipeline for a run */
  async executeRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const log = createLogger(runId);
    let ctx: PipelineContext = emptyContext();

    try {
      // --- STAGE 1: Discovering + Qualifying ---
      log.info("Pipeline started");
      await this.transition(run, "discovering");

      const salesAgent = this.agents.get("sales-intel")!;
      this.updateAgent(run, "sales-intel", { status: "running", startedAt: new Date().toISOString() });

      const salesResult = await salesAgent.execute(
        { runId, context: ctx, prompt: run.input.prompt },
        createLogger(runId, "sales-intel")
      );

      if (!salesResult.success) {
        this.updateAgent(run, "sales-intel", { status: "error", error: salesResult.error ?? "Unknown error" });
        throw new Error(`Sales Intel failed: ${salesResult.error}`);
      }

      const salesData = salesResult.data as { leads: Lead[]; qualifications: Qualification[] };
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

      // --- STAGE 2: CO2 Estimation ---
      await this.transition(run, "estimating");

      const co2Agent = this.agents.get("co2-estimator")!;
      this.updateAgent(run, "co2-estimator", { status: "running", startedAt: new Date().toISOString() });

      const co2Result = await co2Agent.execute(
        { runId, context: ctx, prompt: run.input.prompt },
        createLogger(runId, "co2-estimator")
      );

      if (!co2Result.success) {
        this.updateAgent(run, "co2-estimator", { status: "error", error: co2Result.error ?? "Unknown error" });
        throw new Error(`CO2 Estimator failed: ${co2Result.error}`);
      }

      const co2Data = co2Result.data as { estimates: CO2Estimate[] };
      ctx.estimates = co2Data.estimates;
      this.updateAgent(run, "co2-estimator", {
        status: "done",
        completedAt: new Date().toISOString(),
        output: co2Data,
      });
      await saveContext(runId, ctx).catch(() => {});

      // --- STAGE 3: Project Recommendation ---
      await this.transition(run, "recommending");

      const advisorAgent = this.agents.get("project-advisor")!;
      this.updateAgent(run, "project-advisor", { status: "running", startedAt: new Date().toISOString() });

      const advisorResult = await advisorAgent.execute(
        { runId, context: ctx, prompt: run.input.prompt },
        createLogger(runId, "project-advisor")
      );

      if (!advisorResult.success) {
        this.updateAgent(run, "project-advisor", { status: "error", error: advisorResult.error ?? "Unknown error" });
        throw new Error(`Project Advisor failed: ${advisorResult.error}`);
      }

      const advisorData = advisorResult.data as { recommendations: ProjectRecommendation[] };
      ctx.recommendations = advisorData.recommendations;
      this.updateAgent(run, "project-advisor", {
        status: "done",
        completedAt: new Date().toISOString(),
        output: advisorData,
      });
      await saveContext(runId, ctx).catch(() => {});

      // --- STAGE 4: Presentation Generation ---
      await this.transition(run, "presenting");

      const designAgent = this.agents.get("design-system")!;
      this.updateAgent(run, "design-system", { status: "running", startedAt: new Date().toISOString() });

      const designResult = await designAgent.execute(
        { runId, context: ctx, prompt: run.input.prompt },
        createLogger(runId, "design-system")
      );

      if (!designResult.success) {
        this.updateAgent(run, "design-system", { status: "error", error: designResult.error ?? "Unknown error" });
        throw new Error(`Design System failed: ${designResult.error}`);
      }

      const designData = designResult.data as { artifacts: Artifact[] };
      ctx.artifacts = designData.artifacts;
      this.updateAgent(run, "design-system", {
        status: "done",
        completedAt: new Date().toISOString(),
        output: designData,
      });
      await saveContext(runId, ctx).catch(() => {});

      // --- COMPLETE ---
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

  /** Resolve a pending human gate */
  resolveGate(runId: string, decision: GateDecision): void {
    const resolver = this.gateResolvers.get(runId);
    if (resolver) {
      resolver(decision);
      this.gateResolvers.delete(runId);
    }
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

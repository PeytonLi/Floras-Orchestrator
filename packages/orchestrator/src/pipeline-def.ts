import type {
  PipelineContext,
  PipelineStage,
  Lead,
  Qualification,
  CO2Estimate,
  ProjectRecommendation,
  Artifact,
  InvoiceData,
  TransferAmount,
  LedgerEvent,
} from "@floras/shared";
import type { AgentMeta } from "./registry";

// ============================================================
// Declarative pipeline definition
//
// The engine iterates this ordered list instead of a hardcoded
// if-ladder. Each step names the agent that runs, the work stage
// the engine transitions to, how the agent's output merges into
// the shared context, and an optional human gate.
//
// This honestly models today's flow: the sales-intel step writes
// BOTH leads and qualifications, then passes through the
// `qualifying` stage and blocks on the approval gate. There is no
// separate "qualify" agent (qualification is part of sales intel
// output), and there are no parallel branches.
// ============================================================

export interface GateSpec {
  /** Stage the pipeline sits in while awaiting the human decision */
  stage: PipelineStage;
  /** Build the human-readable summary shown in the approval dialog */
  summarize: (ctx: PipelineContext) => string;
  /** Message logged + recorded as run.error when a human rejects */
  rejectionReason: string;
}

export interface PipelineStep {
  /** Stable step id */
  id: string;
  /** Registry agent id to execute in this step */
  agentId: string;
  /** Work stage the engine transitions to before running the agent */
  stage: PipelineStage;
  /** Merge the agent's validated output into the cumulative context */
  apply: (ctx: PipelineContext, data: unknown) => void;
  /** Intermediate stages to pass through after the agent, before any gate */
  thenStages?: PipelineStage[];
  /** Optional human approval gate after this step */
  gate?: GateSpec;
}

/** Metadata for the four built-in agents, keyed by agent id */
export const BUILTIN_AGENT_META: Record<string, AgentMeta> = {
  "sales-intel": {
    id: "sales-intel",
    stage: "discovering",
    reads: [],
    writes: ["leads", "qualifications"],
  },
  "co2-estimator": {
    id: "co2-estimator",
    stage: "estimating",
    reads: ["leads"],
    writes: ["estimates"],
  },
  "project-advisor": {
    id: "project-advisor",
    stage: "recommending",
    reads: ["leads", "qualifications", "estimates"],
    writes: ["recommendations"],
  },
  "design-system": {
    id: "design-system",
    stage: "presenting",
    reads: ["leads", "qualifications", "estimates", "recommendations"],
    writes: ["artifacts"],
  },
};

/** The default Floras pipeline — reproduces the original flow exactly */
export const DEFAULT_PIPELINE: PipelineStep[] = [
  {
    id: "discover-and-qualify",
    agentId: "sales-intel",
    stage: "discovering",
    apply: (ctx, data) => {
      const d = data as { leads: Lead[]; qualifications: Qualification[] };
      ctx.leads = d.leads;
      ctx.qualifications = d.qualifications;
    },
    thenStages: ["qualifying"],
    gate: {
      stage: "awaiting_approval",
      summarize: (ctx) => {
        const summary = ctx.leads
          .map((l) => {
            const q = ctx.qualifications.find((q) => q.leadId === l.id);
            return `${l.companyName} (score: ${q?.score ?? "N/A"})`;
          })
          .join(", ");
        return `Approve ${ctx.leads.length} qualified leads: ${summary}`;
      },
      rejectionReason: "Rejected by human reviewer",
    },
  },
  {
    id: "estimate",
    agentId: "co2-estimator",
    stage: "estimating",
    apply: (ctx, data) => {
      ctx.estimates = (data as { estimates: CO2Estimate[] }).estimates;
    },
  },
  {
    id: "recommend",
    agentId: "project-advisor",
    stage: "recommending",
    apply: (ctx, data) => {
      ctx.recommendations = (
        data as { recommendations: ProjectRecommendation[] }
      ).recommendations;
    },
  },
  {
    id: "present",
    agentId: "design-system",
    stage: "presenting",
    apply: (ctx, data) => {
      ctx.artifacts = (data as { artifacts: Artifact[] }).artifacts;
    },
  },
];

/** Transfer pipeline stages for invoice-based Floras transfers */
export const TRANSFER_PIPELINE: PipelineStep[] = [
  {
    id: "parse-invoice",
    agentId: "invoice-parser",
    stage: "parsing",
    apply: (ctx, data) => {
      const d = data as { invoice: InvoiceData };
      ctx.invoice = d.invoice;
    },
  },
  {
    id: "calculate-floras",
    agentId: "co2-from-invoice",
    stage: "calculating",
    apply: (ctx, data) => {
      const d = data as { transferAmount: TransferAmount };
      ctx.transferAmount = d.transferAmount;
    },
    gate: {
      stage: "awaiting_approval",
      summarize: (ctx) => {
        if (!ctx.transferAmount)
          return "Review calculated Floras transfer amount";
        return (
          `Transfer ${ctx.transferAmount.florasCount} Floras ` +
          `(${ctx.transferAmount.co2Kg} kg CO2) — ` +
          ctx.transferAmount.calculationBreakdown
        );
      },
      rejectionReason: "Human reviewer rejected the calculated transfer amount",
    },
  },
  {
    id: "execute-transfer",
    agentId: "floras-transfer",
    stage: "transferring",
    apply: (ctx, data) => {
      const d = data as { ledgerEvent: LedgerEvent };
      ctx.ledgerEvents = [...(ctx.ledgerEvents ?? []), d.ledgerEvent];
    },
  },
];

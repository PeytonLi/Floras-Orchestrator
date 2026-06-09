// ============================================================
// Floras Orchestrator — Shared Types
// ============================================================

/** Pipeline stage identifiers */
export type PipelineStage =
  | "idle"
  | "discovering"
  | "qualifying"
  | "awaiting_approval"
  | "estimating"
  | "recommending"
  | "presenting"
  | "complete"
  | "error";

/** Agent status */
export type AgentStatus =
  | "idle"
  | "running"
  | "done"
  | "error"
  | "blocked"
  | "retrying";

/** Per-agent retry and timeout policy */
export interface AgentConfig {
  /** Maximum retry attempts after the first failure (0 = no retries) */
  maxRetries: number;
  /** Base backoff delay in milliseconds between retry attempts */
  backoffMs: number;
  /** Maximum time an agent may run before being considered timed out */
  timeoutMs: number;
}

/** Human gate decision */
export type GateDecision = "pending" | "approved" | "rejected";

/** Log severity levels */
export type LogLevel = "info" | "warn" | "error" | "debug";

// ------------------------------------------------------------
// Core entities
// ------------------------------------------------------------

export interface PipelineRun {
  id: string;
  stage: PipelineStage;
  previousStage: PipelineStage | null;
  createdAt: string; // ISO 8601
  updatedAt: string;
  input: RunInput;
  error: string | null;
  agents: Record<string, AgentState>;
  /** Per-agent retry / timeout configuration (copied from engine defaults at run creation) */
  agentConfigs: Record<string, AgentConfig>;
}

export interface RunInput {
  /** Free-text trigger, e.g. "Find leads in the food & beverage sector" */
  prompt: string;
  /** Optional: attach an invoice PDF path for the CO2 estimator */
  invoicePath?: string;
  /** Optional: customer name for project advisory */
  customerName?: string;
}

export interface AgentState {
  agentId: string;
  status: AgentStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  /** Opaque output data from the agent */
  output: unknown;
}

// ------------------------------------------------------------
// Agent interface contract
// ------------------------------------------------------------

export interface AgentInput {
  runId: string;
  /** Data accumulated so far in the pipeline */
  context: PipelineContext;
  /** The original user prompt */
  prompt: string;
}

export interface AgentOutput {
  success: boolean;
  data: unknown;
  error?: string;
}

export interface PipelineContext {
  leads: Lead[];
  qualifications: Qualification[];
  estimates: CO2Estimate[];
  recommendations: ProjectRecommendation[];
  artifacts: Artifact[];
}

// ------------------------------------------------------------
// Domain models
// ------------------------------------------------------------

export interface Lead {
  id: string;
  companyName: string;
  sector: string;
  signals: string[];
  source: string;
  discoveredAt: string;
}

export interface Qualification {
  leadId: string;
  score: number; // 0–100
  explanation: string;
  factors: QualificationFactor[];
}

export interface QualificationFactor {
  name: string;
  weight: number;
  value: number;
  detail: string;
}

export interface CO2Estimate {
  leadId: string;
  totalKgCO2: number;
  lineItems: CO2LineItem[];
  confidence: "high" | "medium" | "low";
  assumptions: string[];
}

export interface CO2LineItem {
  description: string;
  category: string;
  kgCO2: number;
  source: string;
}

export interface ProjectRecommendation {
  leadId: string;
  projectId: string;
  projectName: string;
  matchScore: number;
  rationale: string;
}

export interface Artifact {
  id: string;
  type: "presentation" | "email" | "one_pager" | "report";
  fileName: string;
  createdAt: string;
  agentId: string;
}

// ------------------------------------------------------------
// Logging & Events
// ------------------------------------------------------------

export interface LogEntry {
  id: string;
  runId: string;
  agentId: string | null;
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface GateEvent {
  runId: string;
  stage: PipelineStage;
  decision: GateDecision;
  decidedBy: string | null; // user ID or null if pending
  decidedAt: string | null;
  summary: string; // human-readable summary of what's being approved
}

// ------------------------------------------------------------
// SSE event types sent to the dashboard
// ------------------------------------------------------------

export type SSEEvent =
  | {
      type: "stage_change";
      data: { runId: string; from: PipelineStage; to: PipelineStage };
    }
  | {
      type: "agent_status";
      data: { runId: string; agentId: string; status: AgentStatus };
    }
  | { type: "log"; data: LogEntry }
  | { type: "gate"; data: GateEvent }
  | { type: "run_complete"; data: { runId: string } }
  | { type: "run_error"; data: { runId: string; error: string } }
  | { type: "run_resumed"; data: { runId: string; from: PipelineStage } }
  | {
      type: "agent_retry";
      data: { runId: string; agentId: string; attempt: number; error: string };
    }
  | {
      type: "agent_stream";
      data: { runId: string; agentId: string; content: string; done: boolean };
    };

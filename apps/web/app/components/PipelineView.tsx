"use client";

import type { PipelineStage } from "@floras/shared";

interface PipelineViewProps {
  currentStage: PipelineStage;
}

const STAGES: { id: PipelineStage; label: string; agent: string }[] = [
  { id: "discovering", label: "Discover", agent: "Sales Intel" },
  { id: "qualifying", label: "Qualify", agent: "Sales Intel" },
  { id: "awaiting_approval", label: "Approve", agent: "Human Gate" },
  { id: "estimating", label: "Estimate", agent: "CO2 Estimator" },
  { id: "recommending", label: "Recommend", agent: "Project Advisor" },
  { id: "presenting", label: "Present", agent: "Design System" },
  { id: "complete", label: "Complete", agent: "" },
];

const STAGE_ORDER: PipelineStage[] = STAGES.map((s) => s.id);

function getStageStatus(
  stage: PipelineStage,
  current: PipelineStage
): "done" | "active" | "pending" | "error" {
  if (current === "error") return "error";
  const currentIdx = STAGE_ORDER.indexOf(current);
  const stageIdx = STAGE_ORDER.indexOf(stage);
  if (stageIdx < currentIdx) return "done";
  if (stageIdx === currentIdx) return "active";
  return "pending";
}

export function PipelineView({ currentStage }: PipelineViewProps) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "stretch", overflowX: "auto", padding: "8px 0" }}>
      {STAGES.map((stage, i) => {
        const status = getStageStatus(stage.id, currentStage);
        return (
          <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                borderRadius: 8,
                minWidth: 100,
                border: `1px solid ${
                  status === "active"
                    ? "var(--accent)"
                    : status === "done"
                    ? "var(--green)"
                    : status === "error"
                    ? "var(--red)"
                    : "var(--border)"
                }`,
                background:
                  status === "active"
                    ? "rgba(99,102,241,0.12)"
                    : status === "done"
                    ? "rgba(34,197,94,0.08)"
                    : status === "error"
                    ? "rgba(239,68,68,0.08)"
                    : "var(--bg-card)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  marginBottom: 6,
                  background:
                    status === "active"
                      ? "var(--accent)"
                      : status === "done"
                      ? "var(--green)"
                      : status === "error"
                      ? "var(--red)"
                      : "var(--text-muted)",
                  boxShadow: status === "active" ? "0 0 8px var(--accent)" : "none",
                  animation: status === "active" ? "pulse 2s infinite" : "none",
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{stage.label}</div>
              {stage.agent && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{stage.agent}</div>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  width: 20,
                  height: 2,
                  background:
                    getStageStatus(STAGES[i + 1].id, currentStage) === "done" ||
                    getStageStatus(stage.id, currentStage) === "done"
                      ? "var(--green)"
                      : "var(--border)",
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

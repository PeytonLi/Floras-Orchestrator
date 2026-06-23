"use client";

import type { PipelineStage } from "@floras/shared";

interface PipelineViewProps {
  currentStage: PipelineStage;
}

const STAGES: { id: PipelineStage; label: string; agent: string }[] = [
  { id: "discovering", label: "Discover", agent: "Sales Intel" },
  { id: "qualifying", label: "Qualify", agent: "Sales Intel" },
  { id: "awaiting_approval", label: "Approve", agent: "Human Gate" },
  { id: "estimating", label: "Estimate", agent: "CO₂ Estimator" },
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
    <div style={{ display: "flex", gap: 4, alignItems: "stretch", overflowX: "auto", padding: "4px 0" }}>
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
                padding: "12px 14px",
                borderRadius: 10,
                minWidth: 96,
                border: `1px solid ${
                  status === "active"
                    ? "var(--color-leaf)"
                    : status === "done"
                    ? "var(--color-border)"
                    : status === "error"
                    ? "var(--red)"
                    : "var(--color-border)"
                }`,
                background:
                  status === "active"
                    ? "var(--color-surface-sage)"
                    : status === "done"
                    ? "var(--color-surface-warm)"
                    : status === "error"
                    ? "rgba(184,50,50,0.06)"
                    : "var(--color-bg)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  marginBottom: 6,
                  background:
                    status === "active"
                      ? "var(--color-leaf)"
                      : status === "done"
                      ? "var(--color-forest)"
                      : status === "error"
                      ? "var(--red)"
                      : "var(--color-border)",
                  boxShadow:
                    status === "active"
                      ? "0 0 8px rgba(74,124,89,0.5)"
                      : "none",
                  animation: status === "active" ? "pulse 2s infinite" : "none",
                }}
              />
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color:
                    status === "active"
                      ? "var(--color-forest)"
                      : status === "done"
                      ? "var(--color-text-muted)"
                      : status === "error"
                      ? "var(--red)"
                      : "var(--color-text-muted)",
                }}
              >
                {stage.label}
              </div>
              {stage.agent && (
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--color-brand-text)",
                    marginTop: 2,
                    letterSpacing: "0.03em",
                  }}
                >
                  {stage.agent}
                </div>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  width: 16,
                  height: 1,
                  background:
                    getStageStatus(STAGES[i + 1].id, currentStage) === "done" ||
                    getStageStatus(stage.id, currentStage) === "done"
                      ? "var(--color-leaf)"
                      : "var(--color-border)",
                  transition: "background 0.3s ease",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

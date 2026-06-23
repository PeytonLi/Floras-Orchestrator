"use client";

import type { AgentState, AgentStatus } from "@floras/shared";

interface AgentCardsProps {
  agents: Record<string, AgentState>;
}

const AGENT_META: Record<string, { name: string; initial: string; team: string }> = {
  "sales-intel": { name: "Sales Intelligence", initial: "S", team: "Team 2" },
  "project-advisor": { name: "Project Advisor", initial: "P", team: "Team 3" },
  "co2-estimator": { name: "CO₂ Estimator", initial: "C", team: "Team 4" },
  "design-system": { name: "Design System", initial: "D", team: "Team 1" },
};

function statusColor(status: AgentStatus): string {
  switch (status) {
    case "running":
    case "retrying":
      return "var(--color-leaf)";
    case "done":
      return "var(--color-forest)";
    case "error":
      return "var(--red)";
    case "blocked":
      return "var(--yellow)";
    default:
      return "var(--color-border)";
  }
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "running": return "Running";
    case "retrying": return "Retrying";
    case "done": return "Complete";
    case "error": return "Error";
    case "blocked": return "Blocked";
    default: return "Idle";
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export function AgentCards({ agents }: AgentCardsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {Object.entries(agents).map(([id, state]) => {
        const meta = AGENT_META[id] ?? { name: id, initial: "?", team: "" };
        const color = statusColor(state.status);
        const isActive = state.status === "running" || state.status === "retrying";

        return (
          <div
            key={id}
            style={{
              background: "var(--color-surface)",
              border: `1px solid ${isActive ? "var(--color-leaf)" : "var(--color-border)"}`,
              borderRadius: 12,
              padding: 16,
              transition: "border-color 0.3s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  background:
                    state.status === "done"
                      ? "var(--color-surface-sage)"
                      : isActive
                      ? "rgba(74,124,89,0.12)"
                      : "var(--color-bg)",
                  color,
                  border: "1px solid var(--color-border-soft)",
                }}
              >
                {meta.initial}
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
                  {meta.name}
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--color-brand-text)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {meta.team}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: isActive ? `0 0 6px ${color}` : "none",
                  animation: isActive ? "pulse 2s infinite" : "none",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.8rem", color, fontWeight: 500 }}>
                {statusLabel(state.status)}
              </span>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              {state.startedAt && (
                <div>Started: {formatTime(state.startedAt)}</div>
              )}
              {state.completedAt && (
                <div>Done: {formatTime(state.completedAt)}</div>
              )}
              {state.error && (
                <div style={{ color: "var(--red)", marginTop: 4 }}>{state.error}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

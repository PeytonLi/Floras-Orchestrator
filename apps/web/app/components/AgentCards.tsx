"use client";

import type { AgentState, AgentStatus } from "@floras/shared";

interface AgentCardsProps {
  agents: Record<string, AgentState>;
}

const AGENT_META: Record<string, { name: string; icon: string; team: string }> = {
  "sales-intel": { name: "Sales Intelligence", icon: "S", team: "Team 2" },
  "project-advisor": { name: "Project Advisor", icon: "P", team: "Team 3" },
  "co2-estimator": { name: "CO2 Estimator", icon: "C", team: "Team 4" },
  "design-system": { name: "Design System", icon: "D", team: "Team 1" },
};

function statusColor(status: AgentStatus): string {
  switch (status) {
    case "running": return "var(--accent)";
    case "done": return "var(--green)";
    case "error": return "var(--red)";
    case "blocked": return "var(--yellow)";
    default: return "var(--text-muted)";
  }
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "running": return "Running";
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
        const meta = AGENT_META[id] ?? { name: id, icon: "?", team: "" };
        const color = statusColor(state.status);

        return (
          <div
            key={id}
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${state.status === "running" ? color : "var(--border)"}`,
              borderRadius: 10,
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
                  fontSize: 16,
                  fontWeight: 700,
                  background: `${color}22`,
                  color,
                }}
              >
                {meta.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{meta.team}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: state.status === "running" ? `0 0 6px ${color}` : "none",
                  animation: state.status === "running" ? "pulse 2s infinite" : "none",
                }}
              />
              <span style={{ fontSize: 12, color }}>{statusLabel(state.status)}</span>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {state.startedAt && <div>Started: {formatTime(state.startedAt)}</div>}
              {state.completedAt && <div>Done: {formatTime(state.completedAt)}</div>}
              {state.error && (
                <div style={{ color: "var(--red)", marginTop: 4, fontSize: 11 }}>
                  {state.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

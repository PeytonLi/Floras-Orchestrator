"use client";

import { useState } from "react";
import type { PipelineRun } from "@floras/shared";

interface ApprovalDialogProps {
  run: PipelineRun;
  gateSummary: string;
  onDecision: (decision: "approved" | "rejected") => void;
}

export function ApprovalDialog({ run, gateSummary, onDecision }: ApprovalDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDecision = async (decision: "approved" | "rejected") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, decidedBy: "dashboard-user" }),
      });
      if (res.ok) {
        onDecision(decision);
      }
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "rgba(251,191,36,0.06)",
        border: "1px solid var(--yellow)",
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "rgba(251,191,36,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          ⏸
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--yellow)" }}>Human Approval Required</div>
      </div>

      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
        {gateSummary || "Review the qualified leads before proceeding to CO2 estimation and project recommendation."}
      </div>

      {/* Show lead summary */}
      <div style={{ marginBottom: 16 }}>
        {Object.values(run.agents)
          .filter((a) => a.agentId === "sales-intel" && a.output)
          .map((a) => {
            const data = a.output as { leads?: Array<{ companyName: string; sector: string }>; qualifications?: Array<{ leadId: string; score: number }> };
            return (data.leads ?? []).map((lead, i) => {
              const qual = (data.qualifications ?? []).find((q) => q.leadId === `lead_${i + 1}`);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--bg-card)",
                    borderRadius: 6,
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                >
                  <span>{lead.companyName}</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {lead.sector} — Score: {qual?.score ?? "?"}
                  </span>
                </div>
              );
            });
          })}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => handleDecision("approved")}
          disabled={loading}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: "var(--green)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Processing..." : "Approve & Continue"}
        </button>
        <button
          onClick={() => handleDecision("rejected")}
          disabled={loading}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid var(--red)",
            background: "transparent",
            color: "var(--red)",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

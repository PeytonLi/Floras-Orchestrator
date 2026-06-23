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
        background: "var(--color-surface)",
        border: "1px solid var(--color-leaf)",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--color-brand-text)",
          marginBottom: 8,
        }}
      >
        Human approval required
      </div>

      <div
        style={{
          fontSize: "0.875rem",
          color: "var(--color-text)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        {gateSummary || "Review the qualified leads before proceeding to CO₂ estimation and project recommendation."}
      </div>

      {/* Lead summary */}
      <div style={{ marginBottom: 20 }}>
        {Object.values(run.agents)
          .filter((a) => a.agentId === "sales-intel" && a.output)
          .map((a) => {
            const data = a.output as {
              leads?: Array<{ companyName: string; sector: string }>;
              qualifications?: Array<{ leadId: string; score: number }>;
            };
            return (data.leads ?? []).map((lead, i) => {
              const qual = (data.qualifications ?? []).find((q) => q.leadId === `lead_${i + 1}`);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--color-surface-warm)",
                    border: "1px solid var(--color-border-soft)",
                    borderRadius: 8,
                    marginBottom: 4,
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                    {lead.companyName}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {lead.sector}
                    {qual && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontWeight: 700,
                          color:
                            qual.score >= 80
                              ? "var(--color-forest)"
                              : qual.score >= 60
                              ? "var(--yellow)"
                              : "var(--red)",
                        }}
                      >
                        {qual.score}
                      </span>
                    )}
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
            background: loading ? "var(--color-text-muted)" : "var(--color-leaf)",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Processing..." : "Approve & continue"}
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
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            fontFamily: "inherit",
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

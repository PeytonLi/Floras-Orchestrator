"use client";

import type { PipelineRun } from "@floras/shared";
import type { Lead, Qualification, CO2Estimate, ProjectRecommendation, Artifact } from "@floras/shared";

interface ResultsPanelProps {
  run: PipelineRun;
}

export function ResultsPanel({ run }: ResultsPanelProps) {
  // Extract data from agent outputs
  const salesData = run.agents["sales-intel"]?.output as {
    leads?: Lead[];
    qualifications?: Qualification[];
  } | null;

  const co2Data = run.agents["co2-estimator"]?.output as {
    estimates?: CO2Estimate[];
  } | null;

  const advisorData = run.agents["project-advisor"]?.output as {
    recommendations?: ProjectRecommendation[];
  } | null;

  const designData = run.agents["design-system"]?.output as {
    artifacts?: Artifact[];
  } | null;

  const leads = salesData?.leads ?? [];
  const quals = salesData?.qualifications ?? [];
  const estimates = co2Data?.estimates ?? [];
  const recs = advisorData?.recommendations ?? [];
  const artifacts = designData?.artifacts ?? [];

  if (leads.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Pipeline Results</h3>

      {/* Leads + Qualifications */}
      {leads.map((lead) => {
        const qual = quals.find((q) => q.leadId === lead.id);
        const est = estimates.find((e) => e.leadId === lead.id);
        const leadRecs = recs.filter((r) => r.leadId === lead.id);

        return (
          <div
            key={lead.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{lead.companyName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{lead.sector} — {lead.source}</div>
              </div>
              {qual && (
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    background: qual.score >= 80 ? "rgba(34,197,94,0.12)" : qual.score >= 60 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)",
                    color: qual.score >= 80 ? "var(--green)" : qual.score >= 60 ? "var(--yellow)" : "var(--red)",
                  }}
                >
                  {qual.score}
                </div>
              )}
            </div>

            {/* Signals */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {lead.signals.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    background: "rgba(99,102,241,0.1)",
                    borderRadius: 4,
                    color: "var(--accent)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>

            {qual && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                {qual.explanation}
              </div>
            )}

            {/* CO2 Estimate */}
            {est && (
              <div style={{ marginTop: 8, padding: 10, background: "var(--bg)", borderRadius: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  CO2 Estimate: {(est.totalKgCO2 / 1000).toFixed(1)}t CO2e
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                    ({est.confidence} confidence)
                  </span>
                </div>
                {est.lineItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", padding: "2px 0" }}>
                    <span>{item.description} ({item.category})</span>
                    <span>{(item.kgCO2 / 1000).toFixed(1)}t</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {leadRecs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Recommended Projects</div>
                {leadRecs.map((rec, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", borderBottom: i < leadRecs.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontWeight: 500 }}>{rec.projectName} (match: {rec.matchScore}%)</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rec.rationale}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Generated Artifacts */}
      {artifacts.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Generated Assets</div>
          {artifacts.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "var(--green)" }}>✓</span>
              <span style={{ color: "var(--text)" }}>{a.fileName}</span>
              <span style={{ color: "var(--text-muted)" }}>({a.type})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

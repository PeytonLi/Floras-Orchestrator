"use client";

import { useState } from "react";
import type { PipelineRun } from "@floras/shared";
import type {
  Lead,
  Qualification,
  CO2Estimate,
  ProjectRecommendation,
  Artifact,
} from "@floras/shared";
import { Card, Badge } from "@floras/ui";

interface ResultsPanelProps {
  run: PipelineRun;
}

type DesignContent = {
  presentation?: {
    titleSlide: string;
    sections: Array<{ heading: string; bullets: string[] }>;
  };
  emailTemplate?: {
    subject: string;
    body: string;
    callToAction: string;
  };
  onePager?: {
    headline: string;
    keyMetrics: Array<{ label: string; value: string }>;
    narrative: string;
  };
};

export function ResultsPanel({ run }: ResultsPanelProps) {
  const [expanded, setExpanded] = useState<{
    pres: boolean;
    email: boolean;
    onepager: boolean;
  }>({
    pres: false,
    email: false,
    onepager: false,
  });

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
    content?: DesignContent;
  } | null;

  const leads = salesData?.leads ?? [];
  const quals = salesData?.qualifications ?? [];
  const estimates = co2Data?.estimates ?? [];
  const recs = advisorData?.recommendations ?? [];
  const artifacts = designData?.artifacts ?? [];
  const designContent = designData?.content ?? null;

  if (leads.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {leads.map((lead) => {
        const qual = quals.find((q) => q.leadId === lead.id);
        const est = estimates.find((e) => e.leadId === lead.id);
        const leadRecs = recs.filter((r) => r.leadId === lead.id);

        return (
          <Card key={lead.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--color-text)",
                  }}
                >
                  {lead.companyName}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                    marginTop: 2,
                  }}
                >
                  {lead.sector} — {lead.source}
                </div>
              </div>
              {qual && (
                <Badge
                  variant={
                    qual.score >= 80
                      ? "success"
                      : qual.score >= 60
                        ? "warning"
                        : "error"
                  }
                >
                  {qual.score}
                </Badge>
              )}
            </div>

            {/* Signals */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              {lead.signals.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    background: "var(--color-surface-sage)",
                    borderRadius: 4,
                    color: "var(--color-forest)",
                    border: "1px solid var(--color-border)",
                    fontWeight: 500,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>

            {qual && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                {qual.explanation}
              </div>
            )}

            {/* CO2 Estimate */}
            {est && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  background: "var(--color-bg)",
                  borderRadius: 8,
                  border: "1px solid var(--color-border-soft)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    marginBottom: 6,
                  }}
                >
                  CO₂ estimate: {(est.totalKgCO2 / 1000).toFixed(1)}t CO₂e
                  <span
                    style={{
                      fontWeight: 400,
                      color: "var(--color-text-muted)",
                      marginLeft: 8,
                    }}
                  >
                    ({est.confidence} confidence)
                  </span>
                </div>
                {est.lineItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      padding: "2px 0",
                    }}
                  >
                    <span>
                      {item.description} ({item.category})
                    </span>
                    <span>{(item.kgCO2 / 1000).toFixed(1)}t</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {leadRecs.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginBottom: 6,
                  }}
                >
                  Recommended projects
                </div>
                {leadRecs.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text)",
                      padding: "6px 0",
                      borderBottom:
                        i < leadRecs.length - 1
                          ? "1px solid var(--color-border-soft)"
                          : "none",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {rec.projectName}
                      <span
                        style={{
                          marginLeft: 8,
                          fontWeight: 400,
                          fontSize: "0.75rem",
                          color: "var(--color-brand-text)",
                        }}
                      >
                        {rec.matchScore}% match
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {rec.rationale}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* Generated Artifacts */}
      {artifacts.length > 0 && (
        <div
          style={{
            background: "var(--color-surface-sage)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              marginBottom: 10,
            }}
          >
            Generated assets
          </div>
          {artifacts.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 0",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ color: "var(--color-leaf)", fontWeight: 700 }}>
                ✓
              </span>
              <span style={{ color: "var(--color-text)" }}>{a.fileName}</span>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                ({a.type})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Generated Content */}
      {designContent && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--text)",
            }}
          >
            Generated Content
          </div>

          {/* Presentation */}
          {designContent.presentation && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, pres: !e.pres }))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: 4,
                }}
              >
                {expanded.pres ? "▾" : "▸"} Presentation —{" "}
                {designContent.presentation.titleSlide}
              </button>
              {expanded.pres && (
                <div style={{ marginLeft: 16, marginTop: 8 }}>
                  {designContent.presentation.sections.map((s, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {s.heading}
                      </div>
                      <ul style={{ marginLeft: 16, marginTop: 4 }}>
                        {s.bullets.map((b, j) => (
                          <li
                            key={j}
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginBottom: 2,
                            }}
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email */}
          {designContent.emailTemplate && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, email: !e.email }))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: 4,
                }}
              >
                {expanded.email ? "▾" : "▸"} Email —{" "}
                {designContent.emailTemplate.subject}
              </button>
              {expanded.email && (
                <div
                  style={{
                    marginLeft: 16,
                    marginTop: 8,
                    padding: 12,
                    background: "var(--bg)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Subject:{" "}
                    <span style={{ color: "var(--text)" }}>
                      {designContent.emailTemplate.subject}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                      marginBottom: 8,
                    }}
                  >
                    {designContent.emailTemplate.body}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--green)",
                    }}
                  >
                    {designContent.emailTemplate.callToAction}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* One-Pager */}
          {designContent.onePager && (
            <div>
              <button
                type="button"
                onClick={() =>
                  setExpanded((e) => ({ ...e, onepager: !e.onepager }))
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: 4,
                }}
              >
                {expanded.onepager ? "▾" : "▸"} One-Pager —{" "}
                {designContent.onePager.headline}
              </button>
              {expanded.onepager && (
                <div style={{ marginLeft: 16, marginTop: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    {designContent.onePager.keyMetrics.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "6px 12px",
                          background: "var(--bg)",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        <div style={{ color: "var(--text-muted)" }}>
                          {m.label}
                        </div>
                        <div style={{ color: "var(--text)", fontWeight: 600 }}>
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {designContent.onePager.narrative}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

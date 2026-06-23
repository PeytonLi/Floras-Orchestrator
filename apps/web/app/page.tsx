"use client";

import { useState, useCallback } from "react";
import type { PipelineRun, IntakeForm } from "@floras/shared";
import { PipelineView } from "./components/PipelineView";
import { AgentCards } from "./components/AgentCards";
import { LogStream } from "./components/LogStream";
import { ApprovalDialog } from "./components/ApprovalDialog";
import { ResultsPanel } from "./components/ResultsPanel";
import { IntakeFormSection, emptyIntakeForm } from "./components/IntakeForm";
import { useSSE } from "./hooks/useSSE";
import { DEMO_RUN, DEMO_LOGS } from "./demoData";

const sectionLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  marginBottom: 12,
};

const card: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

export default function Dashboard() {
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [initialRun, setInitialRun] = useState<PipelineRun | null>(null);
  const [prompt, setPrompt] = useState(
    "Find leads in the food & beverage sector with strong sustainability commitments",
  );
  const [starting, setStarting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [intake, setIntake] = useState<IntakeForm>(emptyIntakeForm());
  const [showIntake, setShowIntake] = useState(false);
  const [pipelineMode, setPipelineMode] = useState<"discovery" | "transfer">(
    "discovery",
  );
  const [scenario, setScenario] = useState<"b2b" | "self" | "b2c">("b2b");

  const {
    logs: sseLogs,
    run,
    gateSummary,
    connected,
    streamContent,
    streamingAgentId,
  } = useSSE(currentRunId, initialRun);

  const logs = demoMode ? DEMO_LOGS : sseLogs;

  const loadDemo = useCallback(() => {
    setDemoMode(true);
    setCurrentRunId(null);
    setInitialRun(DEMO_RUN);
  }, []);

  const resetAll = useCallback(() => {
    setCurrentRunId(null);
    setInitialRun(null);
    setDemoMode(false);
  }, []);

  const handleApproval = () => {};

  const startRun = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, intake, mode: pipelineMode, scenario }),
      });
      if (res.ok) {
        const data = await res.json();
        setInitialRun(data.run);
        setCurrentRunId(data.run.id);
      }
    } catch (err) {
      console.error("Failed to start run:", err);
    } finally {
      setStarting(false);
    }
  }, [prompt, intake]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Top nav bar */}
      <header
        style={{
          background:
            "linear-gradient(135deg, var(--color-wallet-start), var(--color-wallet-end))",
          padding: "0 48px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 300,
              letterSpacing: "0.15em",
              color: "#fff",
            }}
          >
            FLORAS
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              marginLeft: 12,
              borderLeft: "1px solid rgba(255,255,255,0.25)",
              paddingLeft: 12,
            }}
          >
            Orchestrator
          </span>
        </div>
        {connected && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#a8d5b5",
              }}
            />
            <span
              style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}
            >
              Live
            </span>
          </div>
        )}
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.6,
            }}
          >
            Agent orchestration for the Floras climate platform pipeline
          </p>
        </div>

        {/* New Run Input */}
        {!run && (
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={sectionLabel}>New pipeline run</div>

            {/* Mode selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["discovery", "transfer"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPipelineMode(mode)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 6,
                    border:
                      pipelineMode === mode
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    background:
                      pipelineMode === mode
                        ? "rgba(99,102,241,0.12)"
                        : "transparent",
                    color:
                      pipelineMode === mode
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {mode === "discovery" ? "Lead Discovery" : "Invoice Transfer"}
                </button>
              ))}
            </div>

            {/* Scenario selector (transfer mode only) */}
            {pipelineMode === "transfer" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["b2b", "self", "b2c"] as const).map((s) => {
                  const labels = {
                    b2b: "B2B (Peruvian Oil)",
                    self: "Self-Service (Boggio)",
                    b2c: "B2C (Danone)",
                  };
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScenario(s)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        border:
                          scenario === s
                            ? "1px solid var(--green)"
                            : "1px solid var(--border)",
                        background:
                          scenario === s
                            ? "rgba(34,197,94,0.08)"
                            : "transparent",
                        color:
                          scenario === s ? "var(--green)" : "var(--text-muted)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  pipelineMode === "transfer"
                    ? "Supplier name or describe the invoice context..."
                    : "Describe target leads or paste a customer brief..."
                }
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "0.875rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={startRun}
                disabled={starting || !prompt.trim()}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    starting || !prompt.trim()
                      ? "var(--color-text-muted)"
                      : "var(--color-leaf)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: starting ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                }}
              >
                {starting ? "Starting..." : "Run pipeline"}
              </button>
            </div>

            {/* Project preferences intake */}
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowIntake((s) => !s)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-leaf)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                {showIntake ? "− Hide" : "+ Add"} project preferences (optional)
              </button>
              {showIntake && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid var(--color-border-soft)",
                    background: "var(--color-surface-sage)",
                  }}
                >
                  <IntakeFormSection value={intake} onChange={setIntake} />
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--color-border-soft)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
              >
                Or explore a pre-built demo:
              </span>
              <button
                onClick={loadDemo}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--color-leaf)",
                  background: "transparent",
                  color: "var(--color-leaf)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Load demo
              </button>
            </div>
          </div>
        )}

        {/* Active Run Dashboard */}
        {run && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Run ID + Status */}
            <div
              style={{
                ...card,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--mono)",
                    marginBottom: 2,
                  }}
                >
                  {run.id}
                </div>
                <div
                  style={{ fontSize: "0.875rem", color: "var(--color-text)" }}
                >
                  {run.input.prompt}
                </div>
              </div>
              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background:
                    run.stage === "complete"
                      ? "var(--color-surface-sage)"
                      : run.stage === "error"
                        ? "rgba(184,50,50,0.08)"
                        : "rgba(74,124,89,0.1)",
                  color:
                    run.stage === "complete"
                      ? "var(--color-forest)"
                      : run.stage === "error"
                        ? "var(--red)"
                        : "var(--color-leaf)",
                  border: `1px solid ${
                    run.stage === "complete"
                      ? "var(--color-border)"
                      : run.stage === "error"
                        ? "rgba(184,50,50,0.25)"
                        : "var(--color-leaf)"
                  }`,
                }}
              >
                {run.stage.replace(/_/g, " ")}
              </div>
            </div>

            {/* Pipeline Progress */}
            <div style={card}>
              <div style={sectionLabel}>Pipeline progress</div>
              <PipelineView currentStage={run.stage} />
            </div>

            {/* Human Gate */}
            {run.stage === "awaiting_approval" && (
              <ApprovalDialog
                run={run}
                gateSummary={gateSummary}
                onDecision={handleApproval}
              />
            )}

            {/* Agent Status */}
            <div style={card}>
              <div style={sectionLabel}>Agent status</div>
              <AgentCards agents={run.agents} />
            </div>

            {/* Streaming LLM Output */}
            {streamContent && (
              <div style={card}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div style={sectionLabel}>Live agent output</div>
                  {streamingAgentId && (
                    <>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--color-leaf)",
                          animation: "pulse 1.5s infinite",
                          marginLeft: 4,
                          marginTop: -10,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-leaf)",
                          marginTop: -10,
                        }}
                      >
                        {streamingAgentId}
                      </span>
                    </>
                  )}
                </div>
                <div
                  style={{
                    background: "#1a2416",
                    border: `1px solid ${streamingAgentId ? "var(--color-leaf)" : "var(--color-border)"}`,
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: 300,
                    overflowY: "auto",
                    fontFamily: "var(--mono)",
                    fontSize: "0.7rem",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#a8d5b5",
                    transition: "border-color 0.3s",
                  }}
                >
                  {streamContent}
                  {streamingAgentId && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 13,
                        background: "var(--color-leaf)",
                        marginLeft: 2,
                        animation: "pulse 1s step-end infinite",
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Log Stream */}
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 12,
                }}
              >
                <div style={sectionLabel}>Activity log</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {logs.length} entries
                </div>
              </div>
              <LogStream logs={logs} />
            </div>

            {/* Results */}
            {(run.stage === "complete" ||
              run.stage === "presenting" ||
              run.stage === "recommending") && (
              <div style={card}>
                <div style={sectionLabel}>Pipeline results</div>
                <ResultsPanel run={run} />
              </div>
            )}

            {/* Demo indicator */}
            {demoMode && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "var(--color-surface-sage)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Demo mode — showing a completed pipeline run with sample data
              </div>
            )}

            {/* New Run button when complete */}
            {(run.stage === "complete" || run.stage === "error") && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={resetAll}
                  style={{
                    padding: "10px 32px",
                    borderRadius: 8,
                    border: "1px solid var(--color-leaf)",
                    background: "transparent",
                    color: "var(--color-leaf)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Start new run
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

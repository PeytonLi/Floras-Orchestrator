"use client";

import { useState, useCallback } from "react";
import type { PipelineRun } from "@floras/shared";
import { PipelineView } from "./components/PipelineView";
import { AgentCards } from "./components/AgentCards";
import { LogStream } from "./components/LogStream";
import { ApprovalDialog } from "./components/ApprovalDialog";
import { ResultsPanel } from "./components/ResultsPanel";
import { useSSE } from "./hooks/useSSE";
import { DEMO_RUN, DEMO_LOGS } from "./demoData";

export default function Dashboard() {
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [initialRun, setInitialRun] = useState<PipelineRun | null>(null);
  const [prompt, setPrompt] = useState(
    "Find leads in the food & beverage sector with strong sustainability commitments",
  );
  const [starting, setStarting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const {
    logs: sseLogs,
    run,
    gateSummary,
    connected,
    streamContent,
    streamingAgentId,
  } = useSSE(currentRunId, initialRun);

  // In demo mode, use pre-built demo logs; keep runId null so SSE won't connect
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

  const handleApproval = () => {
    // Run state will update via SSE
  };

  const startRun = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
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
  }, [prompt]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, var(--accent), var(--green))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            F
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Floras Orchestrator</h1>
          {connected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginLeft: "auto",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--green)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--green)" }}>Live</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Agent orchestration for the Floras climate platform pipeline
        </p>
      </div>

      {/* New Run Input */}
      {!run && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Start New Pipeline Run
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe target leads or paste a customer brief..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={startRun}
              disabled={starting || !prompt.trim()}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: starting ? "not-allowed" : "pointer",
                opacity: starting ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {starting ? "Starting..." : "Run Pipeline"}
            </button>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Or explore a pre-built demo:
            </span>
            <button
              onClick={loadDemo}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "1px solid var(--green)",
                background: "rgba(34,197,94,0.08)",
                color: "var(--green)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Load Demo
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "var(--mono)",
                }}
              >
                {run.id}
              </span>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                {run.input.prompt}
              </div>
            </div>
            <div
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background:
                  run.stage === "complete"
                    ? "rgba(34,197,94,0.12)"
                    : run.stage === "error"
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(99,102,241,0.12)",
                color:
                  run.stage === "complete"
                    ? "var(--green)"
                    : run.stage === "error"
                      ? "var(--red)"
                      : "var(--accent)",
              }}
            >
              {run.stage.replace(/_/g, " ").toUpperCase()}
            </div>
          </div>

          {/* Pipeline Progress */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Pipeline Progress
            </div>
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
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Agent Status
            </div>
            <AgentCards agents={run.agents} />
          </div>

          {/* Streaming LLM Output */}
          {streamContent && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Live Agent Output
                </div>
                {streamingAgentId && (
                  <>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--accent)",
                      }}
                    >
                      {streamingAgentId}
                    </span>
                  </>
                )}
              </div>
              <div
                style={{
                  background: "#08080d",
                  border: `1px solid ${streamingAgentId ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: 12,
                  maxHeight: 300,
                  overflowY: "auto",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--text-secondary)",
                  transition: "border-color 0.3s",
                }}
              >
                {streamContent}
                {streamingAgentId && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 14,
                      background: "var(--accent)",
                      marginLeft: 2,
                      animation: "pulse 1s step-end infinite",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Log Stream */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Activity Log</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {logs.length} entries
              </div>
            </div>
            <LogStream logs={logs} />
          </div>

          {/* Results */}
          {(run.stage === "complete" ||
            run.stage === "presenting" ||
            run.stage === "recommending") && <ResultsPanel run={run} />}

          {/* Demo indicator */}
          {demoMode && (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(34,197,94,0.08)",
                border: "1px solid var(--green)",
                fontSize: 12,
                color: "var(--green)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>
                Demo Mode — showing a completed pipeline run with sample data
              </span>
            </div>
          )}

          {/* New Run button when complete */}
          {(run.stage === "complete" || run.stage === "error") && (
            <button
              onClick={resetAll}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontSize: 13,
                cursor: "pointer",
                alignSelf: "center",
              }}
            >
              Start New Run
            </button>
          )}
        </div>
      )}
    </div>
  );
}

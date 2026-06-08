"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { SSEEvent, PipelineRun, LogEntry } from "@floras/shared";

interface UseSSEResult {
  logs: LogEntry[];
  run: PipelineRun | null;
  gateSummary: string;
  connected: boolean;
}

export function useSSE(runId: string | null, initialRun: PipelineRun | null): UseSSEResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [run, setRun] = useState<PipelineRun | null>(initialRun);
  const [gateSummary, setGateSummary] = useState("");
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const refreshRun = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data.run);
      }
    } catch {
      // ignore
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) return;

    const es = new EventSource(`/api/runs/${runId}/events`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => setConnected(true));

    es.addEventListener("log", (e) => {
      try {
        const parsed: SSEEvent = JSON.parse(e.data);
        if (parsed.type === "log") {
          setLogs((prev) => [...prev, parsed.data]);
        }
      } catch {}
    });

    es.addEventListener("stage_change", () => refreshRun());
    es.addEventListener("agent_status", () => refreshRun());

    es.addEventListener("gate", (e) => {
      try {
        const parsed: SSEEvent = JSON.parse(e.data);
        if (parsed.type === "gate") {
          setGateSummary(parsed.data.summary);
        }
      } catch {}
      refreshRun();
    });

    es.addEventListener("run_complete", () => refreshRun());
    es.addEventListener("run_error", () => refreshRun());

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [runId, refreshRun]);

  // Sync initial run
  useEffect(() => {
    if (initialRun) setRun(initialRun);
  }, [initialRun]);

  return { logs, run, gateSummary, connected };
}

"use client";

import { useRef, useEffect } from "react";
import type { LogEntry, LogLevel } from "@floras/shared";

interface LogStreamProps {
  logs: LogEntry[];
}

function levelColor(level: LogLevel): string {
  switch (level) {
    case "error": return "var(--red)";
    case "warn": return "var(--yellow)";
    case "debug": return "var(--text-muted)";
    default: return "var(--text-secondary)";
  }
}

function agentTag(agentId: string | null): string {
  if (!agentId) return "[orch]";
  return `[${agentId}]`;
}

function formatTimestamp(iso: string): string {
  return iso.split("T")[1]?.split(".")[0] ?? iso;
}

export function LogStream({ logs }: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        background: "#08080d",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        height: 300,
        overflowY: "auto",
        fontFamily: "var(--mono)",
        fontSize: 12,
        lineHeight: 1.8,
      }}
    >
      {logs.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
          Waiting for pipeline to start...
        </div>
      )}
      {logs.map((entry) => (
        <div key={entry.id} style={{ display: "flex", gap: 8, whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--text-muted)" }}>{formatTimestamp(entry.timestamp)}</span>
          <span style={{ color: levelColor(entry.level), minWidth: 28 }}>
            {entry.level === "error" ? "ERR" : entry.level === "warn" ? "WRN" : "INF"}
          </span>
          <span style={{ color: "var(--accent)", minWidth: 110 }}>{agentTag(entry.agentId)}</span>
          <span style={{ color: entry.level === "error" ? "var(--red)" : "var(--text)", whiteSpace: "pre-wrap" }}>
            {entry.message}
          </span>
        </div>
      ))}
    </div>
  );
}

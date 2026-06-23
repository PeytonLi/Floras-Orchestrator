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
    case "debug": return "#6b8c6b";
    default: return "#7aaa88";
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
        background: "#1a2416",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: 14,
        height: 280,
        overflowY: "auto",
        fontFamily: "var(--mono)",
        fontSize: "0.7rem",
        lineHeight: 1.8,
      }}
    >
      {logs.length === 0 && (
        <div style={{ color: "#4a6a4a", fontStyle: "italic" }}>
          Waiting for pipeline to start...
        </div>
      )}
      {logs.map((entry) => (
        <div key={entry.id} style={{ display: "flex", gap: 10, whiteSpace: "nowrap" }}>
          <span style={{ color: "#4a6a4a", flexShrink: 0 }}>
            {formatTimestamp(entry.timestamp)}
          </span>
          <span style={{ color: levelColor(entry.level), minWidth: 28, flexShrink: 0 }}>
            {entry.level === "error" ? "ERR" : entry.level === "warn" ? "WRN" : "INF"}
          </span>
          <span style={{ color: "var(--color-brand-text)", minWidth: 110, flexShrink: 0 }}>
            {agentTag(entry.agentId)}
          </span>
          <span
            style={{
              color: entry.level === "error" ? "var(--red)" : "#c8dfc8",
              whiteSpace: "pre-wrap",
            }}
          >
            {entry.message}
          </span>
        </div>
      ))}
    </div>
  );
}

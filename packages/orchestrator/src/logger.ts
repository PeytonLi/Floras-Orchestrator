import { eventBus } from "@floras/shared";
import type { LogEntry, LogLevel } from "@floras/shared";
import { saveLog } from "@floras/shared";

// ============================================================
// Structured logger — writes to Neo4j + emits SSE events
// ============================================================

let logCounter = 0;

export function createLogger(runId: string, agentId: string | null = null) {
  const log = (level: LogLevel, message: string, metadata?: Record<string, unknown>) => {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${++logCounter}`,
      runId,
      agentId,
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Emit to SSE listeners immediately (non-blocking)
    eventBus.emit({ type: "log", data: entry });

    // Persist to Neo4j (fire-and-forget, errors logged to console)
    saveLog(entry).catch((err) => {
      console.error("[logger] Failed to persist log:", err);
    });

    // Also write to stdout for CLI debugging
    const tag = agentId ? `[${agentId}]` : "[orch]";
    const ts = entry.timestamp.split("T")[1].split(".")[0];
    const prefix = level === "error" ? "ERR" : level === "warn" ? "WRN" : level === "debug" ? "DBG" : "INF";
    console.log(`${ts} ${prefix} ${tag} ${message}`);
  };

  return {
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;

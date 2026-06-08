import neo4j, { Driver, Session } from "neo4j-driver";
import type { PipelineRun, LogEntry, PipelineContext, Lead, Qualification, CO2Estimate, ProjectRecommendation, Artifact } from "./types";

// ============================================================
// Neo4j client singleton + helpers
// ============================================================

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const user = process.env.NEO4J_USER ?? "neo4j";
    const password = process.env.NEO4J_PASSWORD ?? "password";
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export function getSession(): Session {
  return getDriver().session();
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// ------------------------------------------------------------
// Run persistence
// ------------------------------------------------------------

export async function saveRun(run: PipelineRun): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MERGE (r:Run {id: $id})
       SET r.stage = $stage,
           r.previousStage = $previousStage,
           r.createdAt = $createdAt,
           r.updatedAt = $updatedAt,
           r.input = $input,
           r.error = $error,
           r.agents = $agents`,
      {
        id: run.id,
        stage: run.stage,
        previousStage: run.previousStage,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        input: JSON.stringify(run.input),
        error: run.error,
        agents: JSON.stringify(run.agents),
      }
    );
  } finally {
    await session.close();
  }
}

export async function getRun(runId: string): Promise<PipelineRun | null> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (r:Run {id: $id}) RETURN r", { id: runId });
    if (result.records.length === 0) return null;
    const props = result.records[0].get("r").properties;
    return {
      ...props,
      input: JSON.parse(props.input),
      agents: JSON.parse(props.agents),
    } as PipelineRun;
  } finally {
    await session.close();
  }
}

export async function listRuns(): Promise<PipelineRun[]> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (r:Run) RETURN r ORDER BY r.createdAt DESC LIMIT 50");
    return result.records.map((rec) => {
      const props = rec.get("r").properties;
      return {
        ...props,
        input: JSON.parse(props.input),
        agents: JSON.parse(props.agents),
      } as PipelineRun;
    });
  } finally {
    await session.close();
  }
}

// ------------------------------------------------------------
// Log persistence
// ------------------------------------------------------------

export async function saveLog(entry: LogEntry): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MATCH (r:Run {id: $runId})
       CREATE (l:LogEntry {
         id: $id, runId: $runId, agentId: $agentId,
         level: $level, message: $message, timestamp: $timestamp,
         metadata: $metadata
       })
       CREATE (r)-[:HAS_LOG]->(l)`,
      {
        id: entry.id,
        runId: entry.runId,
        agentId: entry.agentId,
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        metadata: JSON.stringify(entry.metadata ?? {}),
      }
    );
  } finally {
    await session.close();
  }
}

export async function getRunLogs(runId: string): Promise<LogEntry[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (r:Run {id: $runId})-[:HAS_LOG]->(l:LogEntry)
       RETURN l ORDER BY l.timestamp ASC`,
      { runId }
    );
    return result.records.map((rec) => {
      const props = rec.get("l").properties;
      return { ...props, metadata: JSON.parse(props.metadata ?? "{}") } as LogEntry;
    });
  } finally {
    await session.close();
  }
}

// ------------------------------------------------------------
// Context persistence (domain data per run)
// ------------------------------------------------------------

export async function saveContext(runId: string, ctx: PipelineContext): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MATCH (r:Run {id: $runId})
       SET r.context = $context`,
      { runId, context: JSON.stringify(ctx) }
    );
  } finally {
    await session.close();
  }
}

export async function getContext(runId: string): Promise<PipelineContext> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (r:Run {id: $runId}) RETURN r.context AS ctx", { runId });
    if (result.records.length === 0 || !result.records[0].get("ctx")) {
      return emptyContext();
    }
    return JSON.parse(result.records[0].get("ctx")) as PipelineContext;
  } finally {
    await session.close();
  }
}

export function emptyContext(): PipelineContext {
  return {
    leads: [],
    qualifications: [],
    estimates: [],
    recommendations: [],
    artifacts: [],
  };
}

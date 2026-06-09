import neo4j, { Driver, Session } from "neo4j-driver";
import type {
  PipelineRun,
  LogEntry,
  PipelineContext,
  Lead,
  Qualification,
  CO2Estimate,
  ProjectRecommendation,
  Artifact,
} from "./types";

// ============================================================
// Neo4j client singleton + helpers
// ============================================================

let driver: Driver | null = null;

/** Track whether we've confirmed Neo4j is reachable */
let neo4jAvailable = false;

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

/** Check if Neo4j is reachable — call once at startup */
export async function checkConnection(): Promise<boolean> {
  const session = getSession();
  try {
    await session.run("RETURN 1");
    neo4jAvailable = true;
    return true;
  } catch {
    neo4jAvailable = false;
    console.warn("[neo4j] Connection failed — running in memory-only mode");
    return false;
  } finally {
    await session.close();
  }
}

export function isAvailable(): boolean {
  return neo4jAvailable;
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
      },
    );
  } finally {
    await session.close();
  }
}

export async function getRun(runId: string): Promise<PipelineRun | null> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (r:Run {id: $id}) RETURN r", {
      id: runId,
    });
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
    const result = await session.run(
      "MATCH (r:Run) RETURN r ORDER BY r.createdAt DESC LIMIT 50",
    );
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
      },
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
      { runId },
    );
    return result.records.map((rec) => {
      const props = rec.get("l").properties;
      return {
        ...props,
        metadata: JSON.parse(props.metadata ?? "{}"),
      } as LogEntry;
    });
  } finally {
    await session.close();
  }
}

// ------------------------------------------------------------
// Context persistence (domain data per run)
// ------------------------------------------------------------

export async function saveContext(
  runId: string,
  ctx: PipelineContext,
): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MATCH (r:Run {id: $runId})
       SET r.context = $context`,
      { runId, context: JSON.stringify(ctx) },
    );
  } finally {
    await session.close();
  }
}

export async function getContext(runId: string): Promise<PipelineContext> {
  const session = getSession();
  try {
    const result = await session.run(
      "MATCH (r:Run {id: $runId}) RETURN r.context AS ctx",
      { runId },
    );
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

// ============================================================
// Graph‑native domain persistence
// Entities stored as nodes with relationships instead of
// a flat JSON blob — enables cross‑run graph queries.
// ============================================================

/** Ensure indexes exist for fast lookups */
export async function ensureIndexes(): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      "CREATE INDEX lead_id IF NOT EXISTS FOR (l:Lead) ON (l.id)",
    );
    await session.run(
      "CREATE INDEX lead_company IF NOT EXISTS FOR (l:Lead) ON (l.companyName)",
    );
    await session.run(
      "CREATE INDEX project_id IF NOT EXISTS FOR (p:Project) ON (p.id)",
    );
    await session.run(
      "CREATE INDEX qualification_lead IF NOT EXISTS FOR (q:Qualification) ON (q.leadId)",
    );
  } catch {
    // Indexes may already exist; safe to ignore errors
  } finally {
    await session.close();
  }
}

// ------------------------------------------------------------
// Save domain entities as graph nodes
// ------------------------------------------------------------

export async function saveLeads(runId: string, leads: Lead[]): Promise<void> {
  if (!neo4jAvailable) return;
  const session = getSession();
  try {
    for (const lead of leads) {
      await session.run(
        `MERGE (l:Lead {id: $id})
         SET l.companyName = $companyName,
             l.sector = $sector,
             l.signals = $signals,
             l.source = $source,
             l.discoveredAt = $discoveredAt
         WITH l
         MATCH (r:Run {id: $runId})
         MERGE (r)-[:PRODUCED]->(l)`,
        {
          id: lead.id,
          companyName: lead.companyName,
          sector: lead.sector,
          signals: lead.signals,
          source: lead.source,
          discoveredAt: lead.discoveredAt,
          runId,
        },
      );
    }
  } finally {
    await session.close();
  }
}

export async function saveQualifications(
  runId: string,
  qualifications: Qualification[],
): Promise<void> {
  if (!neo4jAvailable) return;
  const session = getSession();
  try {
    for (const qual of qualifications) {
      await session.run(
        `MERGE (q:Qualification {leadId: $leadId})
         SET q.score = $score,
             q.explanation = $explanation,
             q.factors = $factors,
             q.runId = $runId
         WITH q
         MATCH (l:Lead {id: $leadId})
         MERGE (l)-[:QUALIFIED_AS]->(q)`,
        {
          leadId: qual.leadId,
          score: qual.score,
          explanation: qual.explanation,
          factors: JSON.stringify(qual.factors),
          runId,
        },
      );
    }
  } finally {
    await session.close();
  }
}

export async function saveEstimates(
  runId: string,
  estimates: CO2Estimate[],
): Promise<void> {
  if (!neo4jAvailable) return;
  const session = getSession();
  try {
    for (const est of estimates) {
      await session.run(
        `MERGE (e:CO2Estimate {leadId: $leadId, runId: $runId})
         SET e.totalKgCO2 = $totalKgCO2,
             e.lineItems = $lineItems,
             e.confidence = $confidence,
             e.assumptions = $assumptions
         WITH e
         MATCH (l:Lead {id: $leadId})
         MERGE (l)-[:ESTIMATED_AT]->(e)`,
        {
          leadId: est.leadId,
          totalKgCO2: est.totalKgCO2,
          lineItems: JSON.stringify(est.lineItems),
          confidence: est.confidence,
          assumptions: est.assumptions,
          runId,
        },
      );
    }
  } finally {
    await session.close();
  }
}

export async function saveRecommendations(
  runId: string,
  recommendations: ProjectRecommendation[],
): Promise<void> {
  if (!neo4jAvailable) return;
  const session = getSession();
  try {
    for (const rec of recommendations) {
      await session.run(
        `MERGE (pr:ProjectRecommendation {leadId: $leadId, projectId: $projectId, runId: $runId})
         SET pr.projectName = $projectName,
             pr.matchScore = $matchScore,
             pr.rationale = $rationale
         WITH pr
         MATCH (l:Lead {id: $leadId})
         MERGE (l)-[:RECOMMENDED_FOR]->(pr)
         WITH pr
         MERGE (p:Project {id: $projectId})
         SET p.name = $projectName
         MERGE (pr)-[:MATCHES]->(p)`,
        {
          leadId: rec.leadId,
          projectId: rec.projectId,
          projectName: rec.projectName,
          matchScore: rec.matchScore,
          rationale: rec.rationale,
          runId,
        },
      );
    }
  } finally {
    await session.close();
  }
}

export async function saveArtifacts(
  runId: string,
  artifacts: Artifact[],
): Promise<void> {
  if (!neo4jAvailable) return;
  const session = getSession();
  try {
    for (const art of artifacts) {
      await session.run(
        `MERGE (a:Artifact {id: $id})
         SET a.type = $type,
             a.fileName = $fileName,
             a.createdAt = $createdAt,
             a.agentId = $agentId
         WITH a
         MATCH (r:Run {id: $runId})
         MERGE (r)-[:PRODUCED]->(a)`,
        {
          id: art.id,
          type: art.type,
          fileName: art.fileName,
          createdAt: art.createdAt,
          agentId: art.agentId,
          runId,
        },
      );
    }
  } finally {
    await session.close();
  }
}

/** Save all domain entities from a PipelineContext in one call */
export async function saveDomainGraph(
  runId: string,
  ctx: PipelineContext,
): Promise<void> {
  if (!neo4jAvailable) return;
  await Promise.all([
    ctx.leads.length > 0 ? saveLeads(runId, ctx.leads) : Promise.resolve(),
    ctx.qualifications.length > 0
      ? saveQualifications(runId, ctx.qualifications)
      : Promise.resolve(),
    ctx.estimates.length > 0
      ? saveEstimates(runId, ctx.estimates)
      : Promise.resolve(),
    ctx.recommendations.length > 0
      ? saveRecommendations(runId, ctx.recommendations)
      : Promise.resolve(),
    ctx.artifacts.length > 0
      ? saveArtifacts(runId, ctx.artifacts)
      : Promise.resolve(),
  ]);
}

// ============================================================
// Cross‑run graph queries
// ============================================================

/** Get full history for a company across all runs */
export async function getLeadHistory(companyName: string): Promise<{
  companyName: string;
  sector: string;
  appearances: number;
  runs: string[];
  latestQualification: Qualification | null;
  estimates: CO2Estimate[];
  recommendations: ProjectRecommendation[];
} | null> {
  if (!neo4jAvailable) return null;
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (r:Run)-[:PRODUCED]->(l:Lead {companyName: $companyName})
       OPTIONAL MATCH (l)-[:QUALIFIED_AS]->(q:Qualification)
       OPTIONAL MATCH (l)-[:ESTIMATED_AT]->(e:CO2Estimate)
       OPTIONAL MATCH (l)-[:RECOMMENDED_FOR]->(pr:ProjectRecommendation)
       RETURN l,
              collect(DISTINCT r.id) AS runs,
              collect(DISTINCT q) AS qualifications,
              collect(DISTINCT e) AS estimates,
              collect(DISTINCT pr) AS recommendations`,
      { companyName },
    );
    if (result.records.length === 0) return null;
    const rec = result.records[0];
    const lead = rec.get("l").properties;
    const quals = rec.get("qualifications").map((n: any) => ({
      ...n.properties,
      factors: JSON.parse(n.properties.factors ?? "[]"),
    }));
    const ests = rec.get("estimates").map((n: any) => ({
      ...n.properties,
      lineItems: JSON.parse(n.properties.lineItems ?? "[]"),
    }));
    const recs = rec.get("recommendations").map((n: any) => n.properties);
    return {
      companyName: lead.companyName,
      sector: lead.sector,
      appearances: rec.get("runs").length,
      runs: rec.get("runs"),
      latestQualification: quals.length > 0 ? quals[quals.length - 1] : null,
      estimates: ests,
      recommendations: recs,
    };
  } finally {
    await session.close();
  }
}

/** Get all qualified leads across runs above a score threshold */
export async function getQualifiedLeads(
  minScore: number,
): Promise<{ lead: Lead; qualification: Qualification }[]> {
  if (!neo4jAvailable) return [];
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (l:Lead)-[:QUALIFIED_AS]->(q:Qualification)
       WHERE q.score >= $minScore
       RETURN l, q
       ORDER BY q.score DESC`,
      { minScore },
    );
    return result.records.map((rec) => {
      const leadProps = rec.get("l").properties;
      const qualProps = rec.get("q").properties;
      return {
        lead: {
          ...leadProps,
        } as Lead,
        qualification: {
          ...qualProps,
          factors: JSON.parse(qualProps.factors ?? "[]"),
        } as Qualification,
      };
    });
  } finally {
    await session.close();
  }
}

/** Find which projects a company has been recommended across all runs */
export async function getCompanyRecommendations(
  companyName: string,
): Promise<ProjectRecommendation[]> {
  if (!neo4jAvailable) return [];
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (l:Lead {companyName: $companyName})-[:RECOMMENDED_FOR]->(pr:ProjectRecommendation)
       RETURN pr
       ORDER BY pr.matchScore DESC`,
      { companyName },
    );
    return result.records.map(
      (rec) => rec.get("pr").properties as ProjectRecommendation,
    );
  } finally {
    await session.close();
  }
}

/** Get the full graph context for a run — reconstructs PipelineContext from graph */
export async function getRunContextGraph(
  runId: string,
): Promise<PipelineContext> {
  if (!neo4jAvailable) return emptyContext();
  const session = getSession();
  try {
    // Fetch leads + their nested data for this run via PRODUCED relationships
    const result = await session.run(
      `MATCH (r:Run {id: $runId})-[:PRODUCED]->(l:Lead)
       OPTIONAL MATCH (l)-[:QUALIFIED_AS]->(q:Qualification)
       OPTIONAL MATCH (l)-[:ESTIMATED_AT]->(e:CO2Estimate {runId: $runId})
       OPTIONAL MATCH (l)-[:RECOMMENDED_FOR]->(pr:ProjectRecommendation {runId: $runId})
       OPTIONAL MATCH (r)-[:PRODUCED]->(a:Artifact)
       RETURN collect(DISTINCT l) AS leads,
              collect(DISTINCT q) AS qualifications,
              collect(DISTINCT e) AS estimates,
              collect(DISTINCT pr) AS recommendations,
              collect(DISTINCT a) AS artifacts`,
      { runId },
    );
    if (result.records.length === 0) return emptyContext();
    const rec = result.records[0];
    return {
      leads: rec.get("leads").map((n: any) => n.properties as Lead),
      qualifications: rec
        .get("qualifications")
        .filter(Boolean)
        .map((n: any) => ({
          ...n.properties,
          factors: JSON.parse(n.properties.factors ?? "[]"),
        })),
      estimates: rec
        .get("estimates")
        .filter(Boolean)
        .map((n: any) => ({
          ...n.properties,
          lineItems: JSON.parse(n.properties.lineItems ?? "[]"),
        })),
      recommendations: rec
        .get("recommendations")
        .filter(Boolean)
        .map((n: any) => n.properties),
      artifacts: rec
        .get("artifacts")
        .filter(Boolean)
        .map((n: any) => n.properties),
    } as PipelineContext;
  } finally {
    await session.close();
  }
}

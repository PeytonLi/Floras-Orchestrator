import type { Project, IntakeForm, ProjectMatch, MatchFactor } from "./schema";
import { USD_TO_EUR } from "./schema";
import { SEED_PROJECTS } from "./seed-projects";
import { getSession, isAvailable } from "../neo4j";

// ============================================================
// Project matching — grounds the Project Advisor in the catalog
//
// Two-stage: HARD constraints filter the candidate set (region,
// required certificates, project type), then SOFT scoring ranks the
// survivors (impact overlap, budget fit, capacity fit). Every match
// carries a per-factor breakdown so recommendations are explainable.
//
// Runs against Neo4j when available (the knowledge graph), and falls
// back to the in-memory seed catalog so the demo works offline.
// ============================================================

const inList = (value: string, list: string[]): boolean =>
  list.length === 0 || list.includes(value);

/** Apply hard constraints in JS over a project list */
function hardFilter(projects: Project[], intake: IntakeForm): Project[] {
  return projects.filter((p) => {
    const regionOk =
      intake.geographicRegions.length === 0 ||
      p.regions.some((r) => intake.geographicRegions.includes(r));
    const typeOk = inList(p.projectType, intake.projectTypes);
    const certsOk = intake.requiredCertificates.every((c) =>
      p.certificates.includes(c),
    );
    return regionOk && typeOk && certsOk;
  });
}

/** Fetch hard-constraint-satisfying candidates from Neo4j */
async function candidatesFromGraph(intake: IntakeForm): Promise<Project[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Project)
       WHERE ($regions = [] OR EXISTS {
               MATCH (p)-[:LOCATED_IN]->(r:Region) WHERE r.name IN $regions })
         AND ($types = [] OR p.projectType IN $types)
         AND ALL(cert IN $requiredCerts WHERE EXISTS {
               MATCH (p)-[:CERTIFIED_BY]->(c:Certificate) WHERE c.name = cert })
       RETURN p,
              [(p)-[:CERTIFIED_BY]->(c:Certificate) | c.name]   AS certificates,
              [(p)-[:LOCATED_IN]->(r:Region) | r.name]          AS regions,
              [(p)-[:HAS_IMPACT]->(i:ImpactFocus) | i.name]     AS impactFocus`,
      {
        regions: intake.geographicRegions,
        types: intake.projectTypes,
        requiredCerts: intake.requiredCertificates,
      },
    );
    return result.records.map((rec) => {
      const props = rec.get("p").properties;
      return {
        id: props.id,
        name: props.name,
        description: props.description,
        projectType: props.projectType,
        certificates: rec.get("certificates"),
        regions: rec.get("regions"),
        impactFocus: rec.get("impactFocus"),
        pricePerTonneEUR: toNumber(props.pricePerTonneEUR),
        capacityTonnes: toNumber(props.capacityTonnes),
        vintage: toNumber(props.vintage),
      } as Project;
    });
  } finally {
    await session.close();
  }
}

/** neo4j-driver returns Integer objects for ints; normalize to JS number */
function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

function budgetInEUR(intake: IntakeForm): number | undefined {
  if (intake.budget === undefined) return undefined;
  return intake.budgetCurrency === "USD"
    ? intake.budget * USD_TO_EUR
    : intake.budget;
}

/** Score a single project against the intake; returns factor breakdown */
function scoreProject(project: Project, intake: IntakeForm): ProjectMatch {
  const factors: MatchFactor[] = [];

  // Impact overlap (weight 0.40)
  if (intake.impactFocus.length === 0) {
    factors.push({
      name: "Impact focus",
      score: 1,
      weight: 0.4,
      detail: "No impact preference specified — not a differentiator",
    });
  } else {
    const overlap = project.impactFocus.filter((i) =>
      intake.impactFocus.includes(i),
    );
    factors.push({
      name: "Impact focus",
      score: overlap.length / intake.impactFocus.length,
      weight: 0.4,
      detail:
        overlap.length > 0
          ? `Covers ${overlap.join(", ")}`
          : "No overlap with requested impact areas",
    });
  }

  // Budget fit (weight 0.35)
  const budgetEUR = budgetInEUR(intake);
  if (budgetEUR !== undefined && intake.co2TargetTonnes) {
    const requiredCost = project.pricePerTonneEUR * intake.co2TargetTonnes;
    const score = requiredCost <= budgetEUR ? 1 : budgetEUR / requiredCost;
    factors.push({
      name: "Budget fit",
      score: Math.max(0, Math.min(1, score)),
      weight: 0.35,
      detail: `~€${Math.round(requiredCost).toLocaleString()} for ${intake.co2TargetTonnes}t at €${project.pricePerTonneEUR}/t vs €${Math.round(budgetEUR).toLocaleString()} budget`,
    });
  } else {
    factors.push({
      name: "Budget fit",
      score: 1,
      weight: 0.35,
      detail: "No budget/target specified — not a differentiator",
    });
  }

  // Capacity fit (weight 0.25)
  if (intake.co2TargetTonnes) {
    const score =
      project.capacityTonnes >= intake.co2TargetTonnes
        ? 1
        : project.capacityTonnes / intake.co2TargetTonnes;
    factors.push({
      name: "Capacity",
      score: Math.max(0, Math.min(1, score)),
      weight: 0.25,
      detail: `${project.capacityTonnes.toLocaleString()}t available vs ${intake.co2TargetTonnes}t target`,
    });
  } else {
    factors.push({
      name: "Capacity",
      score: 1,
      weight: 0.25,
      detail: "No target specified — not a differentiator",
    });
  }

  const weightSum = factors.reduce((s, f) => s + f.weight, 0);
  const matchScore = Math.round(
    (100 * factors.reduce((s, f) => s + f.score * f.weight, 0)) / weightSum,
  );

  const top = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  const constraints: string[] = [];
  if (intake.geographicRegions.length)
    constraints.push(`region ${project.regions.join("/")}`);
  if (intake.requiredCertificates.length)
    constraints.push(`certified ${project.certificates.join(", ")}`);
  if (intake.projectTypes.length) constraints.push(project.projectType);
  const constraintNote = constraints.length
    ? ` Meets your filters (${constraints.join("; ")}).`
    : "";

  return {
    project,
    matchScore,
    factors,
    explanation: `${project.name} scores ${matchScore}/100.${constraintNote} Strongest factor: ${top.detail.toLowerCase()}.`,
  };
}

/**
 * Recommend catalog projects for an intake, ranked with explanations.
 * @param limit max results (default all candidates)
 */
export async function recommendProjects(
  intake: IntakeForm,
  limit?: number,
): Promise<ProjectMatch[]> {
  const candidates = isAvailable()
    ? await candidatesFromGraph(intake)
    : hardFilter(SEED_PROJECTS, intake);

  const ranked = candidates
    .map((p) => scoreProject(p, intake))
    .sort((a, b) => b.matchScore - a.matchScore);

  return limit ? ranked.slice(0, limit) : ranked;
}

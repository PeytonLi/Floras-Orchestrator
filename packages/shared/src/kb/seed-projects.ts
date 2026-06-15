import projectsData from "./projects.json";
import type { Project } from "./schema";
import { getSession, isAvailable } from "../neo4j";

// ============================================================
// Project catalog seed loader
// ============================================================

/** The bundled Floras project catalog (replace with real data when available) */
export const SEED_PROJECTS: Project[] = projectsData as Project[];

/**
 * Write the project catalog into Neo4j as a knowledge graph:
 *   (:Project)-[:CERTIFIED_BY]->(:Certificate)
 *   (:Project)-[:LOCATED_IN]->(:Region)
 *   (:Project)-[:HAS_IMPACT]->(:ImpactFocus)
 *   (:Project)-[:OF_TYPE]->(:ProjectType)
 *
 * Uses FOREACH (not UNWIND) so projects with empty arrays don't break
 * the write. No-op when Neo4j is unavailable. Returns count seeded.
 */
export async function seedProjectKB(
  projects: Project[] = SEED_PROJECTS,
): Promise<number> {
  if (!isAvailable()) return 0;
  const session = getSession();
  try {
    for (const p of projects) {
      await session.run(
        `MERGE (p:Project {id: $id})
         SET p.name = $name,
             p.description = $description,
             p.projectType = $projectType,
             p.certificates = $certificates,
             p.regions = $regions,
             p.impactFocus = $impactFocus,
             p.pricePerTonneEUR = $pricePerTonneEUR,
             p.capacityTonnes = $capacityTonnes,
             p.vintage = $vintage
         MERGE (t:ProjectType {name: $projectType})
         MERGE (p)-[:OF_TYPE]->(t)
         FOREACH (cert IN $certificates |
           MERGE (c:Certificate {name: cert})
           MERGE (p)-[:CERTIFIED_BY]->(c))
         FOREACH (region IN $regions |
           MERGE (r:Region {name: region})
           MERGE (p)-[:LOCATED_IN]->(r))
         FOREACH (impact IN $impactFocus |
           MERGE (i:ImpactFocus {name: impact})
           MERGE (p)-[:HAS_IMPACT]->(i))`,
        { ...p },
      );
    }
    return projects.length;
  } finally {
    await session.close();
  }
}

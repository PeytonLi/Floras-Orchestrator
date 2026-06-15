import type {
  AgentInput,
  AgentOutput,
  ProjectRecommendation,
} from "@floras/shared";
import { recommendProjects, emptyIntake } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Project Advisor Agent — stub fallback (no LLM required)
// Still grounded: pulls real candidates from the catalog match so
// the offline demo recommends genuine, explainable projects.
// ============================================================

export class ProjectAdvisorStubAgent extends BaseAgent {
  readonly id = "project-advisor";
  readonly name = "Project Advisor (Stub)";
  readonly description =
    "Recommends Floras catalog projects via deterministic intake matching";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads, qualifications } = input.context;

    if (leads.length === 0) {
      return {
        success: false,
        data: null,
        error: "No leads in context to recommend projects for",
      };
    }

    logger.info("Matching catalog projects against intake (stub)");
    const matches = await recommendProjects(input.intake ?? emptyIntake(), 3);

    if (matches.length === 0) {
      logger.warn("No catalog projects satisfy the stated constraints");
      return { success: true, data: { recommendations: [] } };
    }

    const recommendations: ProjectRecommendation[] = [];
    for (const lead of leads) {
      const qual = qualifications.find((q) => q.leadId === lead.id);
      if (!qual || qual.score < 50) continue;

      await sleep(200);
      // Top 2 catalog matches per qualified lead
      for (const m of matches.slice(0, 2)) {
        recommendations.push({
          leadId: lead.id,
          projectId: m.project.id,
          projectName: m.project.name,
          matchScore: m.matchScore,
          rationale: `${m.project.name} fits ${lead.companyName}'s ${lead.sector} profile. ${m.explanation}`,
        });
      }
    }

    logger.info(`Generated ${recommendations.length} project recommendations`);
    return { success: true, data: { recommendations } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

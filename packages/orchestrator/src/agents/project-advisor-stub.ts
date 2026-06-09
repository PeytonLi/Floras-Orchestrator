import type { AgentInput, AgentOutput, ProjectRecommendation } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Project Advisor Agent — stub fallback (no LLM required)
// ============================================================

export class ProjectAdvisorStubAgent extends BaseAgent {
  readonly id = "project-advisor";
  readonly name = "Project Advisor (Stub)";
  readonly description = "Recommends Floras projects from hardcoded sector mapping";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads, qualifications } = input.context;

    if (leads.length === 0) {
      return { success: false, data: null, error: "No leads in context to recommend projects for" };
    }

    logger.info("Matching projects (stub data)");

    const recommendations: ProjectRecommendation[] = [];

    for (const lead of leads) {
      const qual = qualifications.find((q) => q.leadId === lead.id);
      if (!qual || qual.score < 50) continue;

      await sleep(300);
      const sectorProjects = getProjectsForSector(lead.sector);
      for (const project of sectorProjects) {
        recommendations.push({
          leadId: lead.id,
          projectId: project.id,
          projectName: project.name,
          matchScore: Math.min(100, qual.score + Math.floor(Math.random() * 10)),
          rationale: `${project.name} aligns with ${lead.companyName}'s ${lead.sector} operations. ${project.rationale}`,
        });
      }
    }

    logger.info(`Generated ${recommendations.length} project recommendations`);

    return { success: true, data: { recommendations } };
  }
}

function getProjectsForSector(sector: string): { id: string; name: string; rationale: string }[] {
  const projects: Record<string, { id: string; name: string; rationale: string }[]> = {
    "Food & Beverage": [
      { id: "proj_reforest_01", name: "Borneo Reforestation Initiative", rationale: "Directly offsets agricultural supply chain emissions." },
      { id: "proj_regen_02", name: "European Regenerative Agriculture", rationale: "Reduces scope 3 through soil carbon sequestration." },
    ],
    Logistics: [
      { id: "proj_wind_01", name: "North Sea Wind Farm Credits", rationale: "Clean energy offsets fleet consumption during transition." },
      { id: "proj_mangrove_02", name: "Coastal Mangrove Restoration", rationale: "Blue carbon project with high sequestration rates." },
    ],
    Manufacturing: [
      { id: "proj_dac_01", name: "Direct Air Capture - Iceland", rationale: "High-permanence removal for hard-to-abate industrial emissions." },
      { id: "proj_cookstove_02", name: "Clean Cookstove Distribution", rationale: "Avoidance credits with strong social co-benefits." },
    ],
  };

  return projects[sector] ?? [
    { id: "proj_general_01", name: "Verified Carbon Standard Portfolio", rationale: "Diversified portfolio for companies starting their climate journey." },
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

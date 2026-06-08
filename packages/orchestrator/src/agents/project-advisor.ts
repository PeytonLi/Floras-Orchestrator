import type { AgentInput, AgentOutput, ProjectRecommendation } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Project Advisory Agent (Team 3)
// Recommends climate projects based on customer profile
// ============================================================

export class ProjectAdvisorAgent extends BaseAgent {
  readonly id = "project-advisor";
  readonly name = "Project Advisor";
  readonly description = "Recommends Floras climate projects matched to customer goals";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads, qualifications } = input.context;

    if (leads.length === 0) {
      return { success: false, data: null, error: "No leads in context to recommend projects for" };
    }

    logger.info(`Matching projects for ${leads.length} qualified leads`);

    const recommendations: ProjectRecommendation[] = [];

    for (const lead of leads) {
      const qual = qualifications.find((q) => q.leadId === lead.id);
      if (!qual || qual.score < 50) {
        logger.debug(`Skipping ${lead.companyName} — score too low`);
        continue;
      }

      await sleep(800);
      logger.info(`Analyzing project fit for ${lead.companyName}`);

      // Stub: recommend projects based on sector
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

interface ProjectTemplate {
  id: string;
  name: string;
  rationale: string;
}

function getProjectsForSector(sector: string): ProjectTemplate[] {
  const projects: Record<string, ProjectTemplate[]> = {
    "Food & Beverage": [
      { id: "proj_reforest_01", name: "Borneo Reforestation Initiative", rationale: "Directly offsets agricultural supply chain emissions and supports biodiversity in coffee-growing regions." },
      { id: "proj_regen_02", name: "European Regenerative Agriculture", rationale: "Reduces scope 3 emissions through soil carbon sequestration in ingredient supply chains." },
    ],
    Logistics: [
      { id: "proj_wind_01", name: "North Sea Wind Farm Credits", rationale: "Clean energy credits offset fleet energy consumption during transition period." },
      { id: "proj_mangrove_02", name: "Coastal Mangrove Restoration", rationale: "Blue carbon project with high sequestration rates, relevant to port-adjacent operations." },
    ],
    Manufacturing: [
      { id: "proj_dac_01", name: "Direct Air Capture — Iceland", rationale: "High-permanence removal suitable for hard-to-abate industrial emissions." },
      { id: "proj_cookstove_02", name: "Clean Cookstove Distribution", rationale: "Avoidance credits with strong social co-benefits, complements corporate CSR goals." },
    ],
  };

  return projects[sector] ?? [
    { id: "proj_general_01", name: "Verified Carbon Standard Portfolio", rationale: "Diversified portfolio suitable for companies beginning their climate journey." },
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { AgentInput, AgentOutput, Lead, Qualification } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Sales Intelligence Agent (Team 2)
// Discovers leads, qualifies them with scoring
// ============================================================

export class SalesIntelAgent extends BaseAgent {
  readonly id = "sales-intel";
  readonly name = "Sales Intelligence";
  readonly description = "Discovers and qualifies leads based on ICP criteria";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Searching for leads based on prompt", { prompt: input.prompt });

    // Simulate lead discovery with realistic stub data
    await sleep(1500);
    logger.info("Found 3 potential leads");

    const leads: Lead[] = [
      {
        id: "lead_1",
        companyName: "GreenBrew Coffee Co.",
        sector: "Food & Beverage",
        signals: ["Published sustainability report 2025", "Joined SBTi commitment"],
        source: "LinkedIn + News",
        discoveredAt: new Date().toISOString(),
      },
      {
        id: "lead_2",
        companyName: "Nordic Freight Solutions",
        sector: "Logistics",
        signals: ["Fleet electrification announcement", "Carbon-neutral by 2030 pledge"],
        source: "Press release",
        discoveredAt: new Date().toISOString(),
      },
      {
        id: "lead_3",
        companyName: "BioTech Materials AG",
        sector: "Manufacturing",
        signals: ["Supply chain audit completed", "EU taxonomy compliance noted"],
        source: "Industry report",
        discoveredAt: new Date().toISOString(),
      },
    ];

    await sleep(1000);
    logger.info("Scoring leads against qualification criteria");

    const qualifications: Qualification[] = [
      {
        leadId: "lead_1",
        score: 87,
        explanation: "Strong sustainability commitment with active supply chain engagement. Coffee industry has clear Floras use cases.",
        factors: [
          { name: "Sustainability commitment", weight: 0.3, value: 90, detail: "SBTi member with published report" },
          { name: "Industry fit", weight: 0.25, value: 85, detail: "Food & beverage supply chain is core Floras territory" },
          { name: "Company size", weight: 0.2, value: 80, detail: "Mid-market, ideal for Floras onboarding" },
          { name: "Recent signals", weight: 0.25, value: 92, detail: "Multiple recent public commitments" },
        ],
      },
      {
        leadId: "lead_2",
        score: 72,
        explanation: "Logistics company with clear carbon reduction goals. Fleet transition creates measurable impact opportunities.",
        factors: [
          { name: "Sustainability commitment", weight: 0.3, value: 78, detail: "Carbon-neutral pledge is aspirational but concrete" },
          { name: "Industry fit", weight: 0.25, value: 70, detail: "Logistics has indirect supply chain relevance" },
          { name: "Company size", weight: 0.2, value: 65, detail: "Smaller regional player" },
          { name: "Recent signals", weight: 0.25, value: 75, detail: "Fleet electrification is a strong signal" },
        ],
      },
      {
        leadId: "lead_3",
        score: 64,
        explanation: "Manufacturing company with compliance-driven sustainability. Less proactive but regulatory pressure creates opportunity.",
        factors: [
          { name: "Sustainability commitment", weight: 0.3, value: 60, detail: "Compliance-driven rather than mission-driven" },
          { name: "Industry fit", weight: 0.25, value: 75, detail: "Manufacturing supply chains align with Floras" },
          { name: "Company size", weight: 0.2, value: 70, detail: "Enterprise-scale" },
          { name: "Recent signals", weight: 0.25, value: 55, detail: "Audit completed but no public commitment" },
        ],
      },
    ];

    logger.info(`Qualified ${leads.length} leads. Top score: ${qualifications[0].score}`);

    return {
      success: true,
      data: { leads, qualifications },
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { AgentInput, AgentOutput, Lead, Qualification } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Sales Intelligence Agent — stub fallback (no LLM required)
// ============================================================

export class SalesIntelStubAgent extends BaseAgent {
  readonly id = "sales-intel";
  readonly name = "Sales Intelligence (Stub)";
  readonly description = "Discovers and qualifies leads from hardcoded data";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Searching for leads based on prompt", { prompt: input.prompt });

    await sleep(800);
    logger.info("Found 3 potential leads (stub data)");

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

    await sleep(500);
    logger.info("Scoring leads against qualification criteria (stub)");

    const qualifications: Qualification[] = [
      {
        leadId: "lead_1",
        score: 87,
        explanation: "Strong sustainability commitment with active supply chain engagement.",
        factors: [
          { name: "Sustainability commitment", weight: 0.3, value: 90, detail: "SBTi member with published report" },
          { name: "Industry fit", weight: 0.25, value: 85, detail: "Food & beverage fits core Floras territory" },
          { name: "Company size", weight: 0.2, value: 80, detail: "Mid-market" },
          { name: "Recent signals", weight: 0.25, value: 92, detail: "Multiple recent public commitments" },
        ],
      },
      {
        leadId: "lead_2",
        score: 72,
        explanation: "Clear carbon reduction goals but indirect supply chain relevance.",
        factors: [
          { name: "Sustainability commitment", weight: 0.3, value: 78, detail: "Carbon-neutral pledge" },
          { name: "Industry fit", weight: 0.25, value: 70, detail: "Indirect supply chain relevance" },
          { name: "Company size", weight: 0.2, value: 65, detail: "Smaller regional player" },
          { name: "Recent signals", weight: 0.25, value: 75, detail: "Fleet electrification" },
        ],
      },
      {
        leadId: "lead_3",
        score: 64,
        explanation: "Compliance-driven sustainability. Regulatory pressure creates opportunity.",
        factors: [
          { name: "Sustainability commitment", weight: 0.3, value: 60, detail: "Compliance-driven" },
          { name: "Industry fit", weight: 0.25, value: 75, detail: "Manufacturing supply chains align" },
          { name: "Company size", weight: 0.2, value: 70, detail: "Enterprise-scale" },
          { name: "Recent signals", weight: 0.25, value: 55, detail: "Audit completed" },
        ],
      },
    ];

    logger.info(`Qualified ${leads.length} leads. Top score: ${qualifications[0].score}`);

    return { success: true, data: { leads, qualifications } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

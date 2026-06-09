import type { AgentInput, AgentOutput, CO2Estimate } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// CO2 Estimator Agent — stub fallback (no LLM required)
// ============================================================

export class CO2EstimatorStubAgent extends BaseAgent {
  readonly id = "co2-estimator";
  readonly name = "CO2 Estimator (Stub)";
  readonly description = "Estimates carbon footprint from hardcoded sector data";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads } = input.context;

    if (leads.length === 0) {
      return { success: false, data: null, error: "No leads in context for CO2 estimation" };
    }

    logger.info("Starting CO2 estimation (stub data)");

    const estimates: CO2Estimate[] = [];

    for (const lead of leads) {
      await sleep(400);
      logger.info(`Estimating footprint for ${lead.companyName} (${lead.sector})`);

      const sectorData = getSectorEstimate(lead.sector);

      const estimate: CO2Estimate = {
        leadId: lead.id,
        totalKgCO2: sectorData.lineItems.reduce((sum, item) => sum + item.kgCO2, 0),
        lineItems: sectorData.lineItems,
        confidence: sectorData.confidence,
        assumptions: sectorData.assumptions,
      };

      estimates.push(estimate);
    }

    logger.info(`Completed estimates for ${estimates.length} leads`);

    return { success: true, data: { estimates } };
  }
}

const SECTOR_DATA: Record<string, {
  lineItems: { description: string; category: string; kgCO2: number; source: string }[];
  confidence: "high" | "medium" | "low";
  assumptions: string[];
}> = {
  "Food & Beverage": {
    lineItems: [
      { description: "Raw material sourcing", category: "Scope 3 - Upstream", kgCO2: 45000, source: "DEFRA 2024 emission factors" },
      { description: "Processing & packaging", category: "Scope 1 - Direct", kgCO2: 18000, source: "Industry benchmark (GHG Protocol)" },
      { description: "Distribution & logistics", category: "Scope 3 - Downstream", kgCO2: 12000, source: "EcoInvent database" },
      { description: "Office & facilities", category: "Scope 2 - Energy", kgCO2: 5500, source: "Grid emission factor (EU avg)" },
    ],
    confidence: "medium",
    assumptions: ["Mid-market company size (100-500 employees) assumed", "European operations with average grid mix"],
  },
  Logistics: {
    lineItems: [
      { description: "Fleet fuel consumption", category: "Scope 1 - Direct", kgCO2: 85000, source: "Fleet size estimate x avg km/year" },
      { description: "Warehouse energy", category: "Scope 2 - Energy", kgCO2: 22000, source: "Warehouse m2 x energy intensity" },
      { description: "Subcontracted transport", category: "Scope 3 - Upstream", kgCO2: 35000, source: "Industry average outsourcing ratio" },
    ],
    confidence: "low",
    assumptions: ["Mixed diesel/electric fleet assumed", "Regional operations (< 1000km average haul)"],
  },
  Manufacturing: {
    lineItems: [
      { description: "Industrial processes", category: "Scope 1 - Direct", kgCO2: 120000, source: "Sector average per revenue unit" },
      { description: "Purchased electricity", category: "Scope 2 - Energy", kgCO2: 55000, source: "Grid factor x estimated consumption" },
      { description: "Raw materials", category: "Scope 3 - Upstream", kgCO2: 68000, source: "Material intensity benchmarks" },
      { description: "Waste treatment", category: "Scope 3 - Downstream", kgCO2: 8000, source: "EU waste treatment averages" },
    ],
    confidence: "low",
    assumptions: ["Heavy industry process emissions from sector averages", "EU manufacturing energy mix assumed"],
  },
};

function getSectorEstimate(sector: string) {
  return SECTOR_DATA[sector] ?? {
    lineItems: [
      { description: "General operations", category: "Scope 1+2", kgCO2: 30000, source: "Cross-sector average" },
      { description: "Supply chain", category: "Scope 3", kgCO2: 20000, source: "Cross-sector average" },
    ],
    confidence: "low" as const,
    assumptions: ["No sector-specific data available", "Cross-industry averages applied"],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { AgentInput, AgentOutput, CO2Estimate, CO2LineItem } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// CO2 Estimation Agent (Team 4)
// Parses invoices, estimates carbon footprint
// ============================================================

export class CO2EstimatorAgent extends BaseAgent {
  readonly id = "co2-estimator";
  readonly name = "CO2 Estimator";
  readonly description = "Estimates carbon footprint from invoice data and industry benchmarks";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads } = input.context;

    if (leads.length === 0) {
      return { success: false, data: null, error: "No leads in context for CO2 estimation" };
    }

    logger.info("Starting CO2 estimation for qualified leads");

    const estimates: CO2Estimate[] = [];

    for (const lead of leads) {
      await sleep(1200);
      logger.info(`Estimating footprint for ${lead.companyName} (${lead.sector})`);

      // Stub: generate realistic estimates based on sector
      const sectorData = getSectorEstimate(lead.sector);

      const estimate: CO2Estimate = {
        leadId: lead.id,
        totalKgCO2: sectorData.lineItems.reduce((sum, item) => sum + item.kgCO2, 0),
        lineItems: sectorData.lineItems,
        confidence: sectorData.confidence,
        assumptions: sectorData.assumptions,
      };

      logger.info(
        `${lead.companyName}: estimated ${(estimate.totalKgCO2 / 1000).toFixed(1)}t CO2e (${estimate.confidence} confidence)`
      );

      estimates.push(estimate);
    }

    logger.info(`Completed estimates for ${estimates.length} leads`);

    return { success: true, data: { estimates } };
  }
}

interface SectorEstimate {
  lineItems: CO2LineItem[];
  confidence: "high" | "medium" | "low";
  assumptions: string[];
}

function getSectorEstimate(sector: string): SectorEstimate {
  const estimates: Record<string, SectorEstimate> = {
    "Food & Beverage": {
      lineItems: [
        { description: "Raw material sourcing", category: "Scope 3 - Upstream", kgCO2: 45000, source: "DEFRA 2024 emission factors" },
        { description: "Processing & packaging", category: "Scope 1 - Direct", kgCO2: 18000, source: "Industry benchmark (GHG Protocol)" },
        { description: "Distribution & logistics", category: "Scope 3 - Downstream", kgCO2: 12000, source: "EcoInvent database" },
        { description: "Office & facilities", category: "Scope 2 - Energy", kgCO2: 5500, source: "Grid emission factor (EU avg)" },
      ],
      confidence: "medium",
      assumptions: [
        "Mid-market company size (100-500 employees) assumed",
        "European operations with average grid mix",
        "Standard supply chain complexity for sector",
        "No on-site renewable energy assumed",
      ],
    },
    Logistics: {
      lineItems: [
        { description: "Fleet fuel consumption", category: "Scope 1 - Direct", kgCO2: 85000, source: "Fleet size estimate × avg km/year" },
        { description: "Warehouse energy", category: "Scope 2 - Energy", kgCO2: 22000, source: "Warehouse m² × energy intensity" },
        { description: "Subcontracted transport", category: "Scope 3 - Upstream", kgCO2: 35000, source: "Industry average outsourcing ratio" },
      ],
      confidence: "low",
      assumptions: [
        "Fleet composition unknown — assumed mixed diesel/electric",
        "Regional operations (< 1000km average haul)",
        "Warehouse efficiency at industry average",
        "Electrification timeline not factored in",
      ],
    },
    Manufacturing: {
      lineItems: [
        { description: "Industrial processes", category: "Scope 1 - Direct", kgCO2: 120000, source: "Sector average per revenue unit" },
        { description: "Purchased electricity", category: "Scope 2 - Energy", kgCO2: 55000, source: "Grid factor × estimated consumption" },
        { description: "Raw materials", category: "Scope 3 - Upstream", kgCO2: 68000, source: "Material intensity benchmarks" },
        { description: "Waste treatment", category: "Scope 3 - Downstream", kgCO2: 8000, source: "EU waste treatment averages" },
      ],
      confidence: "low",
      assumptions: [
        "Heavy industry process emissions estimated from sector averages",
        "Specific product mix unknown",
        "EU manufacturing energy mix assumed",
        "No renewable energy procurement data available",
      ],
    },
  };

  return estimates[sector] ?? {
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

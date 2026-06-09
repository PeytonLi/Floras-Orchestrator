import type { AgentInput } from "@floras/shared";
import { BaseLLMAgent } from "./base-llm-agent";
import { CO2EstimatorOutputSchema } from "./schemas";

// ============================================================
// CO2 Estimation Agent (Team 4)
// Estimates carbon footprint via LLM with sector benchmarks
// ============================================================

export class CO2EstimatorAgent extends BaseLLMAgent {
  readonly id = "co2-estimator";
  readonly name = "CO2 Estimator";
  readonly description =
    "Estimates carbon footprint from company profile and industry benchmarks";
  readonly outputSchema = CO2EstimatorOutputSchema;

  readonly systemPrompt = `You are a carbon accounting expert for Floras, a climate platform.

Given a list of qualified leads with company names and sectors, estimate their
annual carbon footprint (kg CO2e) broken down by GHG Protocol scopes:

- Scope 1: Direct emissions (fuel, processes, fleet)
- Scope 2: Purchased energy (electricity, heating)
- Scope 3: Upstream/Downstream (supply chain, logistics, waste)

For each lead, provide:
- 3-5 line items with description, category, kgCO2, and source methodology
- A confidence level (high/medium/low) based on data availability
- Key assumptions made

Use realistic emission factors (DEFRA, EPA, GHG Protocol benchmarks).
Total estimates should be in the range of 10,000–500,000 kgCO2e for mid-market
companies, scaled appropriately by sector (manufacturing > logistics > services).

Return a JSON object with an "estimates" array.`;

  buildUserMessage(input: AgentInput): string {
    const leads = input.context.leads
      .map((l) => `- ${l.companyName} (${l.sector})`)
      .join("\n");

    return `Qualified leads to estimate:\n${leads}\n\nEstimate the carbon footprint for each lead. Include line items by scope, confidence level, and key assumptions.`;
  }
}

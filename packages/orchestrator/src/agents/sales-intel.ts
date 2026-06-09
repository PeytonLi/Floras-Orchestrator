import type { AgentInput } from "@floras/shared";
import { BaseLLMAgent } from "./base-llm-agent";
import { SalesIntelOutputSchema } from "./schemas";

// ============================================================
// Sales Intelligence Agent (Team 2)
// Discovers leads, qualifies them with scoring via LLM
// ============================================================

export class SalesIntelAgent extends BaseLLMAgent {
  readonly id = "sales-intel";
  readonly name = "Sales Intelligence";
  readonly description = "Discovers and qualifies leads based on ICP criteria";
  readonly outputSchema = SalesIntelOutputSchema;

  readonly systemPrompt = `You are a B2B sales intelligence analyst for Floras, a climate platform
that sells carbon credits and funds sustainability projects for enterprises.

Your job: Given a user's target description, discover 3-5 real or highly
realistic companies that match and qualify them with a 0-100 score based on:

1. Sustainability commitment — public pledges, SBTi membership, ESG reports
2. Industry fit — how well their supply chain maps to Floras' project portfolio
3. Company size — mid-market to enterprise (100-10,000 employees)
4. Recent signals — funding rounds, sustainability hires, regulatory pressure

Be specific. Use real company names. Every qualification needs named factors
with weights, scores, and detailed explanations.

Return a JSON object with "leads" and "qualifications" arrays. Each
qualification's leadId must match an index into the leads array (e.g. "0" for
the first lead, "1" for the second). Include discoveredAt as today's date.`;

  buildUserMessage(input: AgentInput): string {
    return `Search target: ${input.prompt}

Discover companies matching this description. For each, provide qualification
factors with detailed explanations. Return at least 3 leads.`;
  }
}

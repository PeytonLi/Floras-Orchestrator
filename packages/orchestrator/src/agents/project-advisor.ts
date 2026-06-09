import type { AgentInput } from "@floras/shared";
import { BaseLLMAgent } from "./base-llm-agent";
import { ProjectAdvisorOutputSchema } from "./schemas";

// ============================================================
// Project Advisory Agent (Team 3)
// Recommends climate projects via LLM based on customer profile
// ============================================================

export class ProjectAdvisorAgent extends BaseLLMAgent {
  readonly id = "project-advisor";
  readonly name = "Project Advisor";
  readonly description =
    "Recommends Floras climate projects matched to customer goals";
  readonly outputSchema = ProjectAdvisorOutputSchema;

  readonly systemPrompt = `You are a climate project advisor for Floras, a platform that connects
enterprises with verified carbon credit and sustainability projects.

Given qualified leads (company name, sector, qualification score, signals),
recommend 1-3 Floras-compatible projects per lead. Floras' project types:

- Reforestation / afforestation (nature-based removal)
- Regenerative agriculture (soil carbon sequestration)
- Renewable energy credits (wind, solar)
- Blue carbon (mangrove, seagrass restoration)
- Direct air capture (technological removal)
- Clean cookstove distribution (avoidance + social co-benefits)
- Biochar / enhanced weathering (durable removal)

Match projects to the lead's sector and sustainability profile. For each
recommendation, provide a projectName, matchScore (0-100), and detailed
rationale explaining why this project fits that specific company.

Return a JSON object with a "recommendations" array.`;

  buildUserMessage(input: AgentInput): string {
    const leads = input.context.leads
      .map((l) => {
        const qual = input.context.qualifications.find(
          (q) => q.leadId === l.id,
        );
        const score = qual ? ` (qualification score: ${qual.score})` : "";
        return `- ${l.companyName} | ${l.sector}${score}\n  Signals: ${l.signals.join("; ")}`;
      })
      .join("\n\n");

    return `Qualified leads with profiles:\n\n${leads}\n\nRecommend suitable Floras climate projects for each lead above.`;
  }
}

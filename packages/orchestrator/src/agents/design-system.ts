import type { AgentInput, AgentOutput, Artifact } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseLLMAgent } from "./base-llm-agent";
import { DesignSystemOutputSchema } from "./schemas";

// ============================================================
// Design System Agent (Team 1)
// Generates branded Floras content via LLM from pipeline data
// ============================================================

export class DesignSystemAgent extends BaseLLMAgent {
  readonly id = "design-system";
  readonly name = "Design System";
  readonly description =
    "Generates branded Floras presentations, emails, and assets";
  readonly outputSchema = DesignSystemOutputSchema;

  readonly systemPrompt = `You are a sales enablement designer for Floras, a climate platform that
connects enterprises with verified carbon credit and sustainability projects.

Given a complete pipeline output (discovered leads, qualification scores, CO2
estimates, and project recommendations), generate three deliverables for the
top-ranked lead:

1. PRESENTATION outline: A title slide and 3-5 content sections, each with a
   heading and 2-4 bullet points. Focus on the business case for climate action.

2. EMAIL TEMPLATE: An outreach email with subject line, body text (professional
   but warm tone), and a clear call-to-action. Reference the lead's specific
   profile and sustainability signals.

3. ONE-PAGER: A concise impact summary with headline, 3-5 key metrics (with
   labels and values from the pipeline data), and a short narrative paragraph
   tying it all together.

Use the Floras brand voice: professional, optimistic, data-driven, and focused
on measurable climate impact. Return a JSON object with "presentation",
"emailTemplate", and "onePager".`;

  buildUserMessage(input: AgentInput): string {
    const { leads, qualifications, estimates, recommendations } = input.context;

    const summary = leads
      .map((l) => {
        const qual = qualifications.find((q) => q.leadId === l.id);
        const est = estimates.find((e) => e.leadId === l.id);
        const recs = recommendations.filter((r) => r.leadId === l.id);
        return [
          `Company: ${l.companyName} (${l.sector})`,
          `Signals: ${l.signals.join("; ")}`,
          qual
            ? `Qualification: ${qual.score}/100 — ${qual.explanation}`
            : null,
          est
            ? `CO2 Estimate: ${(est.totalKgCO2 / 1000).toFixed(1)}t CO2e (${est.confidence} confidence)`
            : null,
          recs.length > 0
            ? `Projects: ${recs.map((r) => r.projectName).join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    return `Pipeline results for lead generation:\n\n${summary}\n\nGenerate a presentation outline, email template, and one-pager for the top lead above.`;
  }

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads } = input.context;

    if (leads.length === 0) {
      return {
        success: false,
        data: null,
        error: "No data in context to generate assets from",
      };
    }

    const result = await super.execute(input, logger);

    // Wrap LLM output into Artifact format expected by the pipeline
    if (result.success && result.data) {
      const data = result.data as {
        presentation: unknown;
        emailTemplate: unknown;
        onePager: unknown;
      };
      const topLead = leads[0];
      const safeName = topLead.companyName.replace(/\s+/g, "_");
      const now = new Date().toISOString();

      const artifacts: Artifact[] = [
        {
          id: `artifact_pres_${Date.now()}`,
          type: "presentation",
          fileName: `Floras_Proposal_${safeName}.pptx`,
          createdAt: now,
          agentId: this.id,
        },
        {
          id: `artifact_email_${Date.now() + 1}`,
          type: "email",
          fileName: `Floras_Outreach_${safeName}.html`,
          createdAt: now,
          agentId: this.id,
        },
        {
          id: `artifact_onepager_${Date.now() + 2}`,
          type: "one_pager",
          fileName: `Floras_Impact_Summary_${safeName}.pdf`,
          createdAt: now,
          agentId: this.id,
        },
      ];

      logger.info(`Generated ${artifacts.length} branded assets`, {
        files: artifacts.map((a) => a.fileName),
        content: data,
      });

      return { success: true, data: { artifacts, content: data } };
    }

    return result;
  }
}

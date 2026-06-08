import type { AgentInput, AgentOutput, Artifact } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Design System Agent (Team 1)
// Generates branded Floras assets from pipeline data
// ============================================================

export class DesignSystemAgent extends BaseAgent {
  readonly id = "design-system";
  readonly name = "Design System";
  readonly description = "Generates branded Floras presentations, emails, and assets";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads, qualifications, estimates, recommendations } = input.context;

    if (leads.length === 0) {
      return { success: false, data: null, error: "No data in context to generate assets from" };
    }

    logger.info("Generating branded Floras deliverables");

    const artifacts: Artifact[] = [];

    // Generate a presentation for the top lead
    const topLead = leads[0];
    const topQual = qualifications.find((q) => q.leadId === topLead.id);
    const topEstimate = estimates.find((e) => e.leadId === topLead.id);
    const topRecs = recommendations.filter((r) => r.leadId === topLead.id);

    await sleep(2000);
    logger.info(`Building sales presentation for ${topLead.companyName}`);

    artifacts.push({
      id: `artifact_pres_${Date.now()}`,
      type: "presentation",
      fileName: `Floras_Proposal_${topLead.companyName.replace(/\s+/g, "_")}.pptx`,
      createdAt: new Date().toISOString(),
      agentId: this.id,
    });

    await sleep(1000);
    logger.info("Building outreach email template");

    artifacts.push({
      id: `artifact_email_${Date.now()}`,
      type: "email",
      fileName: `Floras_Outreach_${topLead.companyName.replace(/\s+/g, "_")}.html`,
      createdAt: new Date().toISOString(),
      agentId: this.id,
    });

    await sleep(800);
    logger.info("Building impact one-pager");

    artifacts.push({
      id: `artifact_onepager_${Date.now()}`,
      type: "one_pager",
      fileName: `Floras_Impact_Summary_${topLead.companyName.replace(/\s+/g, "_")}.pdf`,
      createdAt: new Date().toISOString(),
      agentId: this.id,
    });

    logger.info(`Generated ${artifacts.length} branded assets`, {
      files: artifacts.map((a) => a.fileName),
    });

    return { success: true, data: { artifacts } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

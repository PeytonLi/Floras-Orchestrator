import type { AgentInput, AgentOutput, Artifact } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

// ============================================================
// Design System Agent — stub fallback (no LLM required)
// ============================================================

export class DesignSystemStubAgent extends BaseAgent {
  readonly id = "design-system";
  readonly name = "Design System (Stub)";
  readonly description = "Generates branded Floras assets (hardcoded file entries)";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    const { leads } = input.context;

    if (leads.length === 0) {
      return { success: false, data: null, error: "No data in context to generate assets from" };
    }

    logger.info("Generating branded Floras deliverables (stub)");

    const artifacts: Artifact[] = [];
    const topLead = leads[0];
    const safeName = topLead.companyName.replace(/\s+/g, "_");

    await sleep(800);
    logger.info(`Building sales presentation for ${topLead.companyName}`);

    artifacts.push({
      id: `artifact_pres_${Date.now()}`,
      type: "presentation",
      fileName: `Floras_Proposal_${safeName}.pptx`,
      createdAt: new Date().toISOString(),
      agentId: this.id,
    });

    await sleep(500);
    artifacts.push({
      id: `artifact_email_${Date.now()}`,
      type: "email",
      fileName: `Floras_Outreach_${safeName}.html`,
      createdAt: new Date().toISOString(),
      agentId: this.id,
    });

    await sleep(400);
    artifacts.push({
      id: `artifact_onepager_${Date.now()}`,
      type: "one_pager",
      fileName: `Floras_Impact_Summary_${safeName}.pdf`,
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

import type { AgentInput, ProjectMatch } from "@floras/shared";
import { recommendProjects, emptyIntake } from "@floras/shared";
import { BaseLLMAgent } from "./base-llm-agent";
import { ProjectAdvisorOutputSchema } from "./schemas";

// ============================================================
// Project Advisory Agent (Team 3)
// Grounded recommendation: retrieves candidate projects from the
// Floras catalog (Neo4j KB, in-memory fallback) filtered + scored
// against the customer intake, then the LLM picks per lead and
// writes the rationale. The LLM may ONLY choose from the candidates
// — no invented projects.
// ============================================================

export class ProjectAdvisorAgent extends BaseLLMAgent {
  readonly id = "project-advisor";
  readonly name = "Project Advisor";
  readonly description =
    "Recommends Floras catalog projects matched to customer goals";
  readonly outputSchema = ProjectAdvisorOutputSchema;

  readonly systemPrompt = `You are a climate project advisor for Floras, a platform that connects
enterprises with verified carbon credit and sustainability projects.

You are given (1) a CANDIDATE PROJECTS list retrieved from the Floras catalog
and already filtered + scored against the customer's stated preferences, and
(2) qualified leads. Recommend 1-3 projects per lead, choosing ONLY from the
candidate list. Never invent a project or a projectId.

For each recommendation return: leadId, the exact projectId and projectName from
the candidate list, a matchScore (0-100, start from the candidate's score and
adjust for sector fit), and a detailed rationale that references the candidate's
match factors and why it fits that specific company.

Return a JSON object with a "recommendations" array.`;

  async buildUserMessage(input: AgentInput): Promise<string> {
    const intake = input.intake ?? emptyIntake();
    const matches = await recommendProjects(intake, 8);

    const candidateBlock =
      matches.length > 0
        ? matches.map(formatCandidate).join("\n\n")
        : "(No catalog projects satisfy the stated hard constraints. Recommend nothing and explain that the filters are too restrictive.)";

    const leads = input.context.leads
      .map((l) => {
        const qual = input.context.qualifications.find(
          (q) => q.leadId === l.id,
        );
        const score = qual ? ` (qualification score: ${qual.score})` : "";
        return `- leadId=${l.id} | ${l.companyName} | ${l.sector}${score}\n  Signals: ${l.signals.join("; ")}`;
      })
      .join("\n\n");

    return `CANDIDATE PROJECTS (choose only from these):\n\n${candidateBlock}\n\n---\n\nQUALIFIED LEADS:\n\n${leads}\n\nRecommend suitable candidate projects for each lead above.`;
  }
}

function formatCandidate(m: ProjectMatch): string {
  const p = m.project;
  const factors = m.factors
    .map((f) => `${f.name} ${(f.score * 100).toFixed(0)}% (${f.detail})`)
    .join("; ");
  return `projectId=${p.id} | ${p.name} [${p.projectType}, ${p.regions.join("/")}]
  Certificates: ${p.certificates.join(", ")} | Impact: ${p.impactFocus.join(", ")} | €${p.pricePerTonneEUR}/t
  Match score: ${m.matchScore}/100 — factors: ${factors}
  ${p.description}`;
}

import { z } from "zod";

// ============================================================
// Zod output schemas for each agent's structured LLM response
// ============================================================

// --- Sales Intelligence Agent ---

export const SalesIntelOutputSchema = z.object({
  leads: z.array(
    z.object({
      companyName: z.string().min(1),
      sector: z.string().min(1),
      signals: z.array(z.string()),
      source: z.string().min(1),
    })
  ),
  qualifications: z.array(
    z.object({
      leadId: z.string().min(1),
      score: z.number().min(0).max(100),
      explanation: z.string().min(1),
      factors: z.array(
        z.object({
          name: z.string().min(1),
          weight: z.number().min(0).max(1),
          value: z.number().min(0).max(100),
          detail: z.string().min(1),
        })
      ),
    })
  ),
});

// --- CO2 Estimator Agent ---

export const CO2EstimatorOutputSchema = z.object({
  estimates: z.array(
    z.object({
      leadId: z.string().min(1),
      totalKgCO2: z.number().positive(),
      lineItems: z.array(
        z.object({
          description: z.string().min(1),
          category: z.string().min(1),
          kgCO2: z.number().positive(),
          source: z.string().min(1),
        })
      ),
      confidence: z.enum(["high", "medium", "low"]),
      assumptions: z.array(z.string()),
    })
  ),
});

// --- Project Advisor Agent ---

export const ProjectAdvisorOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      leadId: z.string().min(1),
      projectName: z.string().min(1),
      matchScore: z.number().min(0).max(100),
      rationale: z.string().min(1),
    })
  ),
});

// --- Design System Agent ---

export const DesignSystemOutputSchema = z.object({
  presentation: z.object({
    titleSlide: z.string().min(1),
    sections: z.array(
      z.object({
        heading: z.string().min(1),
        bullets: z.array(z.string()),
      })
    ),
  }),
  emailTemplate: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    callToAction: z.string().min(1),
  }),
  onePager: z.object({
    headline: z.string().min(1),
    keyMetrics: z.array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    ),
    narrative: z.string().min(1),
  }),
});

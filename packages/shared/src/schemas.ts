import { z } from "zod";

// ============================================================
// Zod validation schemas for API inputs
// ============================================================

export const IntakeFormSchema = z.object({
  geographicRegions: z.array(z.string()).default([]),
  requiredCertificates: z.array(z.string()).default([]),
  impactFocus: z.array(z.string()).default([]),
  projectTypes: z.array(z.string()).default([]),
  budget: z.number().positive().optional(),
  budgetCurrency: z.enum(["EUR", "USD"]).optional(),
  co2TargetTonnes: z.number().positive().optional(),
});

export const RunInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  invoicePath: z.string().optional(),
  customerName: z.string().optional(),
  intake: IntakeFormSchema.optional(),
  mode: z.enum(["discovery", "transfer"]).optional().default("discovery"),
  scenario: z.enum(["b2b", "self", "b2c"]).optional().default("b2b"),
  supplierName: z.string().optional(),
});

export const ApprovalSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decidedBy: z.string().min(1),
  reason: z.string().optional(),
});

export const PipelineStageSchema = z.enum([
  "idle",
  "discovering",
  "qualifying",
  "awaiting_approval",
  "estimating",
  "recommending",
  "presenting",
  "complete",
  "error",
  "parsing",
  "calculating",
  "transferring",
  "confirming",
]);

export type RunInputDTO = z.infer<typeof RunInputSchema>;
export type ApprovalDTO = z.infer<typeof ApprovalSchema>;

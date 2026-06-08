import { z } from "zod";

// ============================================================
// Zod validation schemas for API inputs
// ============================================================

export const RunInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  invoicePath: z.string().optional(),
  customerName: z.string().optional(),
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
]);

export type RunInputDTO = z.infer<typeof RunInputSchema>;
export type ApprovalDTO = z.infer<typeof ApprovalSchema>;

import type { PipelineRun, PipelineContext } from "../types";
import type { IntakeForm } from "../kb/schema";
import { getSupabase, isSupabaseConfigured } from "../supabase";

// ============================================================
// RunStore — durable operational mirror for runs
//
// The engine's in-memory Map is runtime truth. This store is a
// best-effort durable mirror so run history + accumulated context
// survive restarts. Every method is safe to call when Supabase is
// unconfigured (it no-ops / returns null). The single home for
// PipelineContext is the `runs.context` column here.
// ============================================================

export interface RunStore {
  isAvailable(): boolean;
  saveRun(run: PipelineRun): Promise<void>;
  getRun(runId: string): Promise<PipelineRun | null>;
  listRuns(limit?: number): Promise<PipelineRun[]>;
  saveContext(runId: string, ctx: PipelineContext): Promise<void>;
  getContext(runId: string): Promise<PipelineContext | null>;
  saveIntake(runId: string, intake: IntakeForm): Promise<void>;
}

/** Supabase-backed run store. No-ops when Supabase isn't configured. */
export class SupabaseRunStore implements RunStore {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  async saveRun(run: PipelineRun): Promise<void> {
    const db = getSupabase();
    if (!db) return;
    await db.from("runs").upsert({
      id: run.id,
      stage: run.stage,
      error: run.error,
      data: run,
      created_at: run.createdAt,
      updated_at: run.updatedAt,
    });
    if (run.input.intake) {
      await this.saveIntake(run.id, run.input.intake);
    }
  }

  async getRun(runId: string): Promise<PipelineRun | null> {
    const db = getSupabase();
    if (!db) return null;
    const { data } = await db
      .from("runs")
      .select("data")
      .eq("id", runId)
      .maybeSingle();
    return (data?.data as PipelineRun) ?? null;
  }

  async listRuns(limit = 50): Promise<PipelineRun[]> {
    const db = getSupabase();
    if (!db) return [];
    const { data } = await db
      .from("runs")
      .select("data")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => row.data as PipelineRun);
  }

  async saveContext(runId: string, ctx: PipelineContext): Promise<void> {
    const db = getSupabase();
    if (!db) return;
    await db
      .from("runs")
      .update({ context: ctx, updated_at: new Date().toISOString() })
      .eq("id", runId);
  }

  async getContext(runId: string): Promise<PipelineContext | null> {
    const db = getSupabase();
    if (!db) return null;
    const { data } = await db
      .from("runs")
      .select("context")
      .eq("id", runId)
      .maybeSingle();
    return (data?.context as PipelineContext) ?? null;
  }

  async saveIntake(runId: string, intake: IntakeForm): Promise<void> {
    const db = getSupabase();
    if (!db) return;
    await db.from("intake_forms").upsert({
      run_id: runId,
      form: intake,
      created_at: new Date().toISOString(),
    });
  }
}

/** Default store instance used by the engine */
export const runStore: RunStore = new SupabaseRunStore();

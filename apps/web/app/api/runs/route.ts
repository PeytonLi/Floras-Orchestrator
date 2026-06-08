import { NextRequest, NextResponse } from "next/server";
import { engine } from "@floras/orchestrator";
import { RunInputSchema } from "@floras/shared";

export const dynamic = "force-dynamic";

/** GET /api/runs — list all runs */
export async function GET() {
  const runs = engine.listRuns();
  return NextResponse.json({ runs });
}

/** POST /api/runs — create and start a new pipeline run */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RunInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const run = engine.createRun(parsed.data);

    // Start execution in the background (don't await)
    engine.executeRun(run.id).catch((err) => {
      console.error(`[api] Run ${run.id} failed:`, err);
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

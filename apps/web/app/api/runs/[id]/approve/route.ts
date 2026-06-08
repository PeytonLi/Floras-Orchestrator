import { NextRequest, NextResponse } from "next/server";
import { engine } from "@floras/orchestrator";
import { ApprovalSchema } from "@floras/shared";

export const dynamic = "force-dynamic";

/** POST /api/runs/:id/approve — approve or reject at human gate */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = engine.getRun(params.id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.stage !== "awaiting_approval") {
    return NextResponse.json(
      { error: `Run is not awaiting approval (current stage: ${run.stage})` },
      { status: 409 }
    );
  }

  try {
    const body = await req.json();
    const parsed = ApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    engine.resolveGate(params.id, parsed.data.decision);

    return NextResponse.json({
      message: `Run ${parsed.data.decision}`,
      decision: parsed.data.decision,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { engine } from "@floras/orchestrator";

export const dynamic = "force-dynamic";

/** GET /api/runs/:id — get a single run */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = engine.getRun(params.id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}

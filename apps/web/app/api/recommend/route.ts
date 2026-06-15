import { NextRequest, NextResponse } from "next/server";
import { IntakeFormSchema, recommendProjects } from "@floras/shared";

export const dynamic = "force-dynamic";

/**
 * POST /api/recommend — grounded project recommendations from the Floras
 * catalog knowledge base.
 *
 * Lets other teams' agents query the KB over HTTP without needing Neo4j
 * credentials. Body is an IntakeForm (all fields optional — an empty body
 * returns the full catalog ranked). Optional `?limit=N` caps the results.
 *
 * Example:
 *   POST /api/recommend?limit=5
 *   { "geographicRegions": ["Europe"], "projectTypes": ["Forestry"],
 *     "requiredCertificates": ["Gold Standard"], "co2TargetTonnes": 500 }
 *
 * Response: { recommendations: ProjectMatch[] } — each with a 0-100
 * matchScore, a per-factor breakdown, and a plain-language explanation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = IntakeFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid intake", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const recommendations = await recommendProjects(parsed.data, limit);
    return NextResponse.json({ recommendations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

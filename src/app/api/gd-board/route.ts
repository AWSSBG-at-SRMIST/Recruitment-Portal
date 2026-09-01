import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canEditGDCriteria } from "@/lib/permissions";
import { isRealSubdomain } from "@/lib/validation";
import type { GDCriterionScore } from "@/types";

// Everything the GD evaluation board needs for one subdomain in a single
// round trip: the configured criteria, every candidate in that subdomain,
// and whatever scores already exist for them.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subdomain = new URL(req.url).searchParams.get("subdomain") || "";
  if (!isRealSubdomain(subdomain)) return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  if (!canEditGDCriteria(user, subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [criteria, applications, allScores] = await Promise.all([
    repo.getGDCriteria(subdomain),
    // Only candidates actually moved to the Shortlisted (GD) stage — not
    // every applicant in the subdomain.
    repo.listApplications({ subdomain, status: "SHORTLISTED" }),
    repo.getAllGDScores(),
  ]);

  const applicationIds = new Set(applications.map((a) => a.applicationId));
  const scores: Record<string, GDCriterionScore[]> = {};
  for (const s of allScores) {
    if (applicationIds.has(s.applicationId)) scores[s.applicationId] = s.scores;
  }

  return NextResponse.json({ criteria, applications, scores });
}

import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canEditInterviewCriteria } from "@/lib/permissions";
import { isRealSubdomain } from "@/lib/validation";
import { toApplicationSummary, type InterviewCriterionScore } from "@/types";

// Everything the interview evaluation board needs for one subdomain in a
// single round trip: the configured criteria, every candidate in that
// subdomain, and whatever scores already exist for them.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subdomain = new URL(req.url).searchParams.get("subdomain") || "";
  if (!isRealSubdomain(subdomain)) return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  if (!canEditInterviewCriteria(user, subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [criteria, subdomainApplications, allScores] = await Promise.all([
    repo.getInterviewCriteria(subdomain),
    repo.listApplications({ subdomain }),
    repo.getAllInterviewScores(),
  ]);

  const scores: Record<string, InterviewCriterionScore[]> = {};
  const attendance: Record<string, boolean> = {};
  const scoredIds = new Set<string>();
  for (const s of allScores) {
    scoredIds.add(s.applicationId);
    scores[s.applicationId] = s.scores;
    attendance[s.applicationId] = s.attended;
  }
  // Currently-in-Interview candidates plus anyone already scored here even
  // if they've since moved on — a status change must never make their
  // Interview marks disappear from the board that recorded them.
  const applications = subdomainApplications.filter(
    (a) => a.status === "INTERVIEW" || scoredIds.has(a.applicationId)
  );

  return NextResponse.json({ criteria, applications: applications.map(toApplicationSummary), scores, attendance });
}

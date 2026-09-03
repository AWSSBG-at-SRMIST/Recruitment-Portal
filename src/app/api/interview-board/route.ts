import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canEditInterviewCriteria } from "@/lib/permissions";
import { isRealSubdomain } from "@/lib/validation";
import type { InterviewCriterionScore } from "@/types";

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

  const [criteria, applications, allScores] = await Promise.all([
    repo.getInterviewCriteria(subdomain),
    // Only candidates actually moved to the Interview stage — not every
    // applicant in the subdomain.
    repo.listApplications({ subdomain, status: "INTERVIEW" }),
    repo.getAllInterviewScores(),
  ]);

  const applicationIds = new Set(applications.map((a) => a.applicationId));
  const scores: Record<string, InterviewCriterionScore[]> = {};
  const attendance: Record<string, boolean> = {};
  for (const s of allScores) {
    if (!applicationIds.has(s.applicationId)) continue;
    scores[s.applicationId] = s.scores;
    attendance[s.applicationId] = s.attended;
  }

  return NextResponse.json({ criteria, applications, scores, attendance });
}

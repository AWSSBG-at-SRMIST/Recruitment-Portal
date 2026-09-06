import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { isPresidium, canEditInterviewCriteria } from "@/lib/permissions";
import { DOMAIN_SUBDOMAINS, toApplicationSummary, type Subdomain, type InterviewCriterionScore } from "@/types";
import { InterviewEvaluationBoard } from "@/components/InterviewEvaluationBoard";

export const metadata: Metadata = { title: "Interviews" };
export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Manager/Associate (their own subdomain), Director (their domain),
  // Presidium (everything) — matches who can score interviews.
  const editableSubdomains: Subdomain[] = isPresidium(user)
    ? Object.values(DOMAIN_SUBDOMAINS).flat()
    : Object.values(DOMAIN_SUBDOMAINS)
        .flat()
        .filter((s) => canEditInterviewCriteria(user, s));

  if (editableSubdomains.length === 0) redirect("/dashboard");

  const initialSubdomain = editableSubdomains[0];
  const [criteria, subdomainApplications, allScores] = await Promise.all([
    repo.getInterviewCriteria(initialSubdomain),
    repo.listApplications({ subdomain: initialSubdomain }),
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
  // Currently-in-Interview candidates (still to be scored) plus anyone who
  // was already scored here even if they've since moved on (Selected,
  // Rejected) — a status change must never make their Interview marks
  // disappear from the board that recorded them.
  const applications = subdomainApplications.filter(
    (a) => a.status === "INTERVIEW" || scoredIds.has(a.applicationId)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Interviews</h1>
        <p className="mt-1 text-on-surface-variant">
          Set your subdomain&apos;s evaluation criteria, then rate every candidate 1-10 against them.
        </p>
      </div>

      <InterviewEvaluationBoard
        editableSubdomains={editableSubdomains}
        initialSubdomain={initialSubdomain}
        initialCriteria={criteria}
        initialApplications={applications.map(toApplicationSummary)}
        initialScores={scores}
        initialAttendance={attendance}
      />
    </div>
  );
}

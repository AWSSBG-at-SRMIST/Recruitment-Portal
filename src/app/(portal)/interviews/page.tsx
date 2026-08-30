import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { isPresidium, canEditInterviewCriteria } from "@/lib/permissions";
import { DOMAIN_SUBDOMAINS, type Subdomain, type InterviewCriterionScore } from "@/types";
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
  const [criteria, applications, allScores] = await Promise.all([
    repo.getInterviewCriteria(initialSubdomain),
    // Only candidates actually moved to the Interview stage — not every
    // applicant in the subdomain.
    repo.listApplications({ subdomain: initialSubdomain, status: "INTERVIEW" }),
    repo.getAllInterviewScores(),
  ]);
  const applicationIds = new Set(applications.map((a) => a.applicationId));
  const scores: Record<string, InterviewCriterionScore[]> = {};
  for (const s of allScores) {
    if (applicationIds.has(s.applicationId)) scores[s.applicationId] = s.scores;
  }

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
        initialApplications={applications}
        initialScores={scores}
      />
    </div>
  );
}

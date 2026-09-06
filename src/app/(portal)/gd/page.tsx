import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { isPresidium, canEditGDCriteria } from "@/lib/permissions";
import { DOMAIN_SUBDOMAINS, toApplicationSummary, type Subdomain, type GDCriterionScore } from "@/types";
import { GDEvaluationBoard } from "@/components/GDEvaluationBoard";

export const metadata: Metadata = { title: "Group Discussion" };
export const dynamic = "force-dynamic";

export default async function GDPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Manager/Associate (their own subdomain), Director (their domain),
  // Presidium (everything) — matches who can score GD.
  const editableSubdomains: Subdomain[] = isPresidium(user)
    ? Object.values(DOMAIN_SUBDOMAINS).flat()
    : Object.values(DOMAIN_SUBDOMAINS)
        .flat()
        .filter((s) => canEditGDCriteria(user, s));

  if (editableSubdomains.length === 0) redirect("/dashboard");

  const initialSubdomain = editableSubdomains[0];
  const [criteria, subdomainApplications, allScores] = await Promise.all([
    repo.getGDCriteria(initialSubdomain),
    repo.listApplications({ subdomain: initialSubdomain }),
    repo.getAllGDScores(),
  ]);
  const scores: Record<string, GDCriterionScore[]> = {};
  const attendance: Record<string, boolean> = {};
  const scoredIds = new Set<string>();
  for (const s of allScores) {
    scoredIds.add(s.applicationId);
    scores[s.applicationId] = s.scores;
    attendance[s.applicationId] = s.attended;
  }
  // Currently-shortlisted candidates (still to be scored) plus anyone who
  // was already scored here even if they've since moved on (Interview,
  // Selected, Rejected) — a status change must never make their GD marks
  // disappear from the board that recorded them.
  const applications = subdomainApplications.filter(
    (a) => a.status === "SHORTLISTED" || scoredIds.has(a.applicationId)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Group Discussion</h1>
        <p className="mt-1 text-on-surface-variant">
          Set your subdomain&apos;s evaluation criteria, then rate every shortlisted candidate 1-10 against them.
        </p>
      </div>

      <GDEvaluationBoard
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

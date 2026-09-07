import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/permissions";
import {
  RECRUITMENT_TARGETS,
  GD_FUNNEL_MULTIPLIER,
  INTERVIEW_FUNNEL_MULTIPLIER,
  GENDER_RATIO_TOLERANCE,
} from "@/lib/recruitmentTargets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_DOMAINS, DOMAIN_SUBDOMAINS, type Application, type Domain, type Subdomain } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = getVisibilityScope(user);

  const [applications, allGDScores, allInterviewScores] = await Promise.all([
    repo.listApplications({
      domain: scope.domain || undefined,
      subdomain: scope.subdomain || undefined,
    }),
    repo.getAllGDScores(),
    repo.getAllInterviewScores(),
  ]);
  const visibleDomains = scope.domain ? [scope.domain] : ALL_DOMAINS;

  const total = applications.length;

  // SHORTLISTED/INTERVIEW are waypoints, not destinations — once someone
  // moves on (or gets rejected), their current `status` no longer says they
  // were ever there, so a raw "current status === X" count silently drops
  // toward zero as the funnel progresses. A candidate proves they reached a
  // stage either by currently sitting at/past it, or by having a score
  // record from it (scored-then-rejected still counts as "was shortlisted").
  const gdScoredIds = new Set(allGDScores.map((s) => s.applicationId));
  const interviewScoredIds = new Set(allInterviewScores.map((s) => s.applicationId));
  const everShortlisted = applications.filter(
    (a) =>
      a.status === "SHORTLISTED" ||
      a.status === "INTERVIEW" ||
      a.status === "SELECTED" ||
      (a.status === "REJECTED" && gdScoredIds.has(a.applicationId))
  ).length;
  const everInterviewed = applications.filter(
    (a) =>
      a.status === "INTERVIEW" ||
      a.status === "SELECTED" ||
      (a.status === "REJECTED" && interviewScoredIds.has(a.applicationId))
  ).length;
  const selected = applications.filter((a) => a.status === "SELECTED").length;
  const rejected = applications.filter((a) => a.status === "REJECTED").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Recruitment Dashboard</h1>
        <p className="mt-1 text-on-surface-variant">
          Overview of {total} application{total === 1 ? "" : "s"}
          {scope.domain ? ` in ${scope.domain}` : " across all domains"}
          {scope.subdomain ? ` · ${scope.subdomain}` : ""}.
        </p>
      </div>

      {/* Funnel — cumulative "reached this stage" counts, not a snapshot of
          who's currently sitting there. See the everShortlisted/everInterviewed
          computation above for why that distinction matters. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Total Applied</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Shortlisted</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface">{everShortlisted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Interview</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface">{everInterviewed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Selected</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface">{selected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Rejected</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface">{rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-domain breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        {visibleDomains.map((domain) => {
          const domainApps = applications.filter((a) => a.domain === domain);
          const visibleSubdomains = scope.subdomain
            ? DOMAIN_SUBDOMAINS[domain].filter((s) => s === scope.subdomain)
            : DOMAIN_SUBDOMAINS[domain];
          return (
            <Card key={domain}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{domain}</span>
                  <span className="text-sm font-normal normal-case text-on-surface-variant">{domainApps.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {visibleSubdomains.map((sub) => {
                  const count = domainApps.filter((a) => a.subdomain === sub).length;
                  return (
                    <Link
                      key={sub}
                      href={`/applications?subdomain=${encodeURIComponent(sub)}`}
                      className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm hover:bg-surface-container transition-colors"
                    >
                      <span className="min-w-0 truncate text-on-surface-variant">{sub}</span>
                      <span className="shrink-0 tabular-nums text-on-surface">{count}</span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RecruitmentTargets
        applications={applications}
        gdScoredIds={gdScoredIds}
        interviewScoredIds={interviewScoredIds}
        visibleDomains={visibleDomains}
        scopedSubdomain={scope.subdomain}
      />

      <TopCandidates applications={applications} />
    </div>
  );
}

function RecruitmentTargets({
  applications,
  gdScoredIds,
  interviewScoredIds,
  visibleDomains,
  scopedSubdomain,
}: {
  applications: Application[];
  gdScoredIds: Set<string>;
  interviewScoredIds: Set<string>;
  visibleDomains: Domain[];
  scopedSubdomain: Subdomain | null;
}) {
  const rows = visibleDomains.flatMap((domain) => {
    const subdomains = scopedSubdomain
      ? DOMAIN_SUBDOMAINS[domain].filter((s) => s === scopedSubdomain)
      : DOMAIN_SUBDOMAINS[domain];
    return subdomains.map((subdomain) => {
      const target = RECRUITMENT_TARGETS[subdomain];

      const subApps = applications.filter((a) => a.subdomain === subdomain);
      // Same "ever reached this stage" logic as the top funnel — a raw
      // current-status count silently drops as candidates move on.
      const shortlisted = subApps.filter(
        (a) =>
          a.status === "SHORTLISTED" ||
          a.status === "INTERVIEW" ||
          a.status === "SELECTED" ||
          (a.status === "REJECTED" && gdScoredIds.has(a.applicationId))
      ).length;
      const interview = subApps.filter(
        (a) =>
          a.status === "INTERVIEW" ||
          a.status === "SELECTED" ||
          (a.status === "REJECTED" && interviewScoredIds.has(a.applicationId))
      ).length;
      const selectedApps = subApps.filter((a) => a.status === "SELECTED");
      const male = selectedApps.filter((a) => a.gender === "Male").length;
      const female = selectedApps.filter((a) => a.gender === "Female").length;
      const selectedTotal = selectedApps.length;
      const genderSkewed =
        selectedTotal > 0 && Math.max(male, female) / selectedTotal > GENDER_RATIO_TOLERANCE;

      return {
        domain,
        subdomain,
        target,
        shortlisted,
        gdTarget: target * GD_FUNNEL_MULTIPLIER,
        interview,
        interviewTarget: target * INTERVIEW_FUNNEL_MULTIPLIER,
        selected: selectedTotal,
        male,
        female,
        genderSkewed,
      };
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recruitment targets</CardTitle>
        <p className="text-xs font-normal normal-case text-on-surface-variant">
          Shortlist (GD) aims for 3x the target, Interview 2x — pick the best candidates for however many
          seats are open at the end. Gender is flagged once a subdomain&apos;s selections cross a 60/40 split.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b-2 border-on-surface/10 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3 font-bold">Subdomain</th>
              <th className="px-3 py-3 text-center font-bold">Target</th>
              <th className="px-3 py-3 text-center font-bold">GD (shortlisted)</th>
              <th className="px-3 py-3 text-center font-bold">Interview</th>
              <th className="px-3 py-3 text-center font-bold">Selected</th>
              <th className="px-3 py-3 text-center font-bold">Gender (selected)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.subdomain} className="border-b border-on-surface/10 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/applications?subdomain=${encodeURIComponent(r.subdomain)}`}
                    className="font-medium text-on-surface hover:text-primary"
                  >
                    {r.subdomain}
                  </Link>
                  <div className="text-xs text-on-surface-variant">{r.domain}</div>
                </td>
                <td className="px-3 py-3 text-center font-bold tabular-nums text-primary">{r.target}</td>
                <td className="px-3 py-3 text-center tabular-nums">
                  <span className={r.shortlisted >= r.gdTarget ? "text-emerald-400" : "text-on-surface"}>
                    {r.shortlisted}
                  </span>
                  <span className="text-on-surface-variant"> / {r.gdTarget}</span>
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  <span className={r.interview >= r.interviewTarget ? "text-emerald-400" : "text-on-surface"}>
                    {r.interview}
                  </span>
                  <span className="text-on-surface-variant"> / {r.interviewTarget}</span>
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  <span className={r.selected >= r.target ? "text-emerald-400" : "text-on-surface"}>
                    {r.selected}
                  </span>
                  <span className="text-on-surface-variant"> / {r.target}</span>
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {r.selected === 0 ? (
                    <span className="text-on-surface-variant">—</span>
                  ) : (
                    <span className={r.genderSkewed ? "font-bold text-amber-400" : "text-on-surface"}>
                      {r.male}M / {r.female}F
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TopCandidates({ applications }: { applications: Application[] }) {
  const top = [...applications]
    .filter((a) => a.aiScore !== null)
    .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
    .slice(0, 5);

  if (top.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top-scored candidates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((a) => (
          <Link
            key={a.applicationId}
            href={`/applications/${a.applicationId}`}
            className="flex items-center justify-between gap-3 px-2 py-2 text-sm hover:bg-surface-container transition-colors"
          >
            <span className="min-w-0 truncate text-on-surface">
              {a.name} <span className="text-on-surface-variant">· {a.subdomain}</span>
            </span>
            <span className="shrink-0 font-bold tabular-nums text-primary">{a.aiScore}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

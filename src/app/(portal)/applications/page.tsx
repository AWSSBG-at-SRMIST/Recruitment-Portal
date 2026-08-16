import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import type { ApplicationFilter } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/permissions";
import { ApplicationsFilterBar } from "@/components/ApplicationsFilterBar";
import { StatusBadge, ScorePill } from "@/components/StatusBadge";
import { isValidDomain } from "@/lib/validation";
import type { Application, ApplicationStatus, Subdomain } from "@/types";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

function sortApplications(apps: Application[], sort: string): Application[] {
  const copy = [...apps];
  if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "recent") return copy.sort((a, b) => b.appliedAt - a.appliedAt);
  // default: score high→low, nulls last
  return copy.sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; subdomain?: string; status?: string; sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = getVisibilityScope(user);

  const sp = await searchParams;
  const filter: ApplicationFilter = {};

  if (scope.domain) {
    filter.domain = scope.domain;
  } else if (sp.domain && isValidDomain(sp.domain)) {
    filter.domain = sp.domain;
  }

  if (scope.subdomain) {
    filter.subdomain = scope.subdomain;
  } else if (sp.subdomain) {
    filter.subdomain = sp.subdomain as Subdomain;
  }

  if (sp.status) filter.status = sp.status as ApplicationStatus;

  const applications = sortApplications(await repo.listApplications(filter), sp.sort ?? "score");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Applications</h1>
        <p className="mt-1 text-on-surface-variant">{applications.length} matching applications.</p>
      </div>

      <ApplicationsFilterBar />

      <div className="overflow-hidden border-2 border-on-surface/10 bg-surface-container-lowest card-shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-on-surface/10 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3 font-bold">Candidate</th>
              <th className="px-4 py-3 font-bold">Domain / Subdomain</th>
              <th className="px-4 py-3 font-bold">Year</th>
              <th className="px-4 py-3 text-center font-bold">Score</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.applicationId} className="border-b border-on-surface/10 last:border-0 hover:bg-surface-container transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/applications/${a.applicationId}`} className="font-medium text-on-surface hover:text-primary">
                    {a.name}
                  </Link>
                  <div className="text-xs text-on-surface-variant">{a.regNo}</div>
                </td>
                <td className="px-4 py-3 text-on-surface">
                  <div>{a.domain}</div>
                  <div className="text-xs text-on-surface-variant">{a.subdomain}</div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{a.year}</td>
                <td className="px-4 py-3 text-center">
                  <ScorePill score={a.aiScore} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant">
                  No applications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

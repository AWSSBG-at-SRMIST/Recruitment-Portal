import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_DOMAINS, APPLICATION_STATUSES, DOMAIN_SUBDOMAINS, type Application } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = getVisibilityScope(user);

  const applications = await repo.listApplications({
    domain: scope.domain || undefined,
    subdomain: scope.subdomain || undefined,
  });
  const visibleDomains = scope.domain ? [scope.domain] : ALL_DOMAINS;

  const total = applications.length;
  const byStatus = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, applications.filter((a) => a.status === s).length])
  );

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

      {/* Funnel */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {APPLICATION_STATUSES.map((status) => (
          <Card key={status}>
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">{status}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface">{byStatus[status]}</p>
            </CardContent>
          </Card>
        ))}
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

      <TopCandidates applications={applications} />
    </div>
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

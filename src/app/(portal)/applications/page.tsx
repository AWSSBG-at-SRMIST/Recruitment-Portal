import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/permissions";
import { ApplicationsTable } from "@/components/ApplicationsTable";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = getVisibilityScope(user);

  // The user's visibility scope (domain/subdomain) is a real permission
  // boundary, so it's the only filter still applied server-side — a Manager
  // must never even receive another subdomain's applications over the wire.
  // Every other filter (status, year, gender, sort, pagination) is applied
  // client-side in ApplicationsTable against this one fetch, so switching
  // filters is instant instead of re-scanning the table on every change.
  const applications = await repo.listApplications({
    domain: scope.domain ?? undefined,
    subdomain: scope.subdomain ?? undefined,
  });

  return <ApplicationsTable applications={applications} scopeDomain={scope.domain} scopeSubdomain={scope.subdomain} />;
}

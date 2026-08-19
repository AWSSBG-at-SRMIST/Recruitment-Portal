import Link from "next/link";
import { repo } from "@/lib/repo";
import { ApplicationsFilterBar } from "@/components/ApplicationsFilterBar";
import { StatusBadge, ScorePill } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function sortApplications(apps: any[]) {
  return [...apps].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
}

export default async function PreviewList() {
  const applications = sortApplications(await repo.listApplications());

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Applications</h1>
        <p className="mt-1 text-on-surface-variant">{applications.length} matching applications.</p>
      </div>

      <ApplicationsFilterBar />

      <div className="overflow-x-auto border-2 border-on-surface/10 bg-surface-container-lowest card-shadow">
        <table className="w-full min-w-[640px] text-sm">
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
                <td className="max-w-[220px] px-4 py-3">
                  <Link href={`/applications/${a.applicationId}`} className="block truncate font-medium text-on-surface hover:text-primary">
                    {a.name}
                  </Link>
                  <div className="truncate text-xs text-on-surface-variant">{a.regNo}</div>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

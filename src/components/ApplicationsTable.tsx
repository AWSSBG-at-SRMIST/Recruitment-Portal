"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ApplicationsFilterBar, type ApplicationsFilterValue } from "@/components/ApplicationsFilterBar";
import { StatusBadge, ScorePill } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Application, Domain, Subdomain } from "@/types";

const PAGE_SIZE = 20;
// Session-only, not a URL param — a filter change must stay a pure in-memory
// computation (no navigation, no re-fetch). This is just so filters and the
// search term survive clicking into a candidate and hitting back, which
// unmounts and remounts this component fresh.
const STORAGE_KEY = "applications-table-state-v2";

const DEFAULT_FILTERS: ApplicationsFilterValue = {
  domain: "",
  subdomain: "",
  status: "",
  year: "",
  gender: "",
};

// Always AI score high→low, nulls last — no user-facing sort control.
function sortApplications(apps: Application[]): Application[] {
  return [...apps].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
}

export function ApplicationsTable({
  applications,
  scopeDomain,
  scopeSubdomain,
}: {
  applications: Application[];
  scopeDomain: Domain | null;
  scopeSubdomain: Subdomain | null;
}) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ApplicationsFilterValue>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // A deep link (e.g. the dashboard's "N in Cloud & DevOps" link) wins over
  // any previously saved session filters. Otherwise, restore from
  // sessionStorage so filters survive clicking into a candidate and back.
  // Both happen in an effect (not the initial state) so the first client
  // render still matches the server-rendered HTML (always the defaults).
  useEffect(() => {
    const urlSubdomain = searchParams.get("subdomain");
    if (urlSubdomain) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters((prev) => ({ ...prev, subdomain: urlSubdomain }));
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.filters) setFilters({ ...DEFAULT_FILTERS, ...parsed.filters });
        if (typeof parsed.search === "string") setSearch(parsed.search);
        if (typeof parsed.page === "number") setPage(parsed.page);
      }
    } catch {
      // ignore malformed/blocked storage — just fall back to defaults
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip the very first run — it would otherwise fire before the restore
  // effect's state updates have actually landed, overwriting storage with
  // the defaults we just read it from.
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, search, page }));
    } catch {
      // ignore (private browsing, storage full, etc.) — filters just won't persist
    }
  }, [filters, search, page]);

  // Everything below is a pure in-memory computation over the data already
  // fetched once from the server — no network round trip per filter change,
  // which is what made the old URL-driven (full page re-scan) filters feel
  // laggy as the application count grew.
  const filtered = useMemo(() => {
    let rows = applications;
    if (!scopeDomain && filters.domain) rows = rows.filter((a) => a.domain === filters.domain);
    if (!scopeSubdomain && filters.subdomain) rows = rows.filter((a) => a.subdomain === filters.subdomain);
    if (filters.status) rows = rows.filter((a) => a.status === filters.status);
    if (filters.year) rows = rows.filter((a) => a.year === filters.year);
    if (filters.gender) rows = rows.filter((a) => a.gender === filters.gender);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((a) => a.name.toLowerCase().includes(q) || a.regNo.toLowerCase().includes(q));
    return sortApplications(rows);
  }, [applications, filters, search, scopeDomain, scopeSubdomain]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleFilterChange(patch: Partial<ApplicationsFilterValue>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1); // any filter change invalidates the current page
  }

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Applications</h1>
        <p className="mt-1 text-on-surface-variant">{filtered.length} matching applications.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or registration number…"
          className="pl-10"
        />
      </div>

      <ApplicationsFilterBar
        value={filters}
        onChange={handleFilterChange}
        onClear={handleClear}
        showDomain={!scopeDomain}
        showSubdomain={!scopeSubdomain}
      />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b-2 border-on-surface/10 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3 font-bold">Candidate</th>
              <th className="px-4 py-3 font-bold">Domain / Subdomain</th>
              <th className="px-4 py-3 font-bold">Year</th>
              <th className="px-4 py-3 font-bold">Gender</th>
              <th className="px-4 py-3 text-center font-bold">Score</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((a) => (
              <tr key={a.applicationId} className="border-b border-on-surface/10 last:border-0 hover:bg-surface-container transition-colors">
                <td className="max-w-[220px] px-4 py-3">
                  <Link
                    href={`/applications/${a.applicationId}`}
                    className="block truncate font-medium text-on-surface hover:text-primary"
                  >
                    {a.name}
                  </Link>
                  <div className="truncate text-xs text-on-surface-variant">{a.regNo}</div>
                </td>
                <td className="px-4 py-3 text-on-surface">
                  <div>{a.domain}</div>
                  <div className="text-xs text-on-surface-variant">{a.subdomain}</div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{a.year}</td>
                <td className="px-4 py-3 text-on-surface-variant">{a.gender}</td>
                <td className="px-4 py-3 text-center">
                  <ScorePill score={a.aiScore} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant">
                  No applications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-on-surface-variant">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)}>
                Previous
              </Button>
            )}
            {currentPage < totalPages && (
              <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

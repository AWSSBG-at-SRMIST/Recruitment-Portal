"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ALL_DOMAINS,
  APPLICATION_STATUSES,
  DOMAIN_SUBDOMAINS,
  type Domain,
} from "@/types";

const ANY = "__any__";

export function ApplicationsFilterBar() {
  const router = useRouter();
  const params = useSearchParams();

  const domain = (params.get("domain") as Domain | null) ?? "";
  const subdomain = params.get("subdomain") ?? "";
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "score";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    // Changing domain invalidates a previously chosen subdomain.
    if (key === "domain") next.delete("subdomain");
    router.push(`/applications?${next.toString()}`);
  }

  const subdomainOptions = domain ? DOMAIN_SUBDOMAINS[domain as Domain] : [];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Domain"
        value={domain || ANY}
        onChange={(v) => setParam("domain", v)}
        options={[{ v: ANY, l: "All domains" }, ...ALL_DOMAINS.map((d) => ({ v: d, l: d }))]}
      />
      <FilterSelect
        label="Subdomain"
        value={subdomain || ANY}
        disabled={!domain}
        onChange={(v) => setParam("subdomain", v)}
        options={[{ v: ANY, l: "All subdomains" }, ...subdomainOptions.map((s) => ({ v: s, l: s }))]}
      />
      <FilterSelect
        label="Status"
        value={status || ANY}
        onChange={(v) => setParam("status", v)}
        options={[{ v: ANY, l: "All statuses" }, ...APPLICATION_STATUSES.map((s) => ({ v: s, l: s }))]}
      />
      <FilterSelect
        label="Sort by"
        value={sort}
        onChange={(v) => setParam("sort", v)}
        options={[
          { v: "score", l: "AI score (high→low)" },
          { v: "recent", l: "Most recent" },
          { v: "name", l: "Name (A→Z)" },
        ]}
      />
      {(domain || subdomain || status) && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/applications")}>
          Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>
              {o.l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

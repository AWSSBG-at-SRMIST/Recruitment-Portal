"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ALL_DOMAINS,
  APPLICATION_STATUSES,
  DOMAIN_SUBDOMAINS,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
  type Domain,
} from "@/types";

const ANY = "__any__";

export interface ApplicationsFilterValue {
  domain: string;
  subdomain: string;
  status: string;
  year: string;
  gender: string;
}

interface ApplicationsFilterBarProps {
  value: ApplicationsFilterValue;
  onChange: (patch: Partial<ApplicationsFilterValue>) => void;
  onClear: () => void;
  showDomain: boolean;
  showSubdomain: boolean;
}

export function ApplicationsFilterBar({ value, onChange, onClear, showDomain, showSubdomain }: ApplicationsFilterBarProps) {
  const { domain, subdomain, status, year, gender } = value;

  function setParam(key: keyof ApplicationsFilterValue, v: string) {
    const patch: Partial<ApplicationsFilterValue> = { [key]: v === ANY ? "" : v };
    // Changing domain invalidates a previously chosen subdomain.
    if (key === "domain") patch.subdomain = "";
    onChange(patch);
  }

  const subdomainOptions = domain ? DOMAIN_SUBDOMAINS[domain as Domain] : [];
  const hasActiveFilter = !!(domain || subdomain || status || year || gender);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {showDomain && (
            <FilterSelect
              label="Domain"
              value={domain || ANY}
              onChange={(v) => setParam("domain", v)}
              options={[{ v: ANY, l: "All domains" }, ...ALL_DOMAINS.map((d) => ({ v: d, l: d }))]}
            />
          )}
          {showSubdomain && (
            <FilterSelect
              label="Subdomain"
              value={subdomain || ANY}
              disabled={!domain}
              onChange={(v) => setParam("subdomain", v)}
              options={[{ v: ANY, l: "All subdomains" }, ...subdomainOptions.map((s) => ({ v: s, l: s }))]}
            />
          )}
          <FilterSelect
            label="Status"
            value={status || ANY}
            onChange={(v) => setParam("status", v)}
            options={[{ v: ANY, l: "All statuses" }, ...APPLICATION_STATUSES.map((s) => ({ v: s, l: s }))]}
          />
          <FilterSelect
            label="Year"
            value={year || ANY}
            onChange={(v) => setParam("year", v)}
            options={[{ v: ANY, l: "All years" }, ...YEAR_OPTIONS.map((y) => ({ v: y, l: y }))]}
          />
          <FilterSelect
            label="Gender"
            value={gender || ANY}
            onChange={(v) => setParam("gender", v)}
            options={[{ v: ANY, l: "All genders" }, ...GENDER_OPTIONS.map((g) => ({ v: g, l: g }))]}
          />
        </div>

        {hasActiveFilter && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
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

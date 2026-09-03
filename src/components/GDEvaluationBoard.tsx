"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Application, GDCriterion, GDCriterionScore, Subdomain } from "@/types";

function newCriterion(): GDCriterion {
  return { id: crypto.randomUUID(), label: "" };
}

export function GDEvaluationBoard({
  editableSubdomains,
  initialSubdomain,
  initialCriteria,
  initialApplications,
  initialScores,
  initialAttendance,
}: {
  editableSubdomains: Subdomain[];
  initialSubdomain: Subdomain;
  initialCriteria: GDCriterion[];
  initialApplications: Application[];
  initialScores: Record<string, GDCriterionScore[]>;
  initialAttendance: Record<string, boolean>;
}) {
  const [subdomain, setSubdomain] = useState(initialSubdomain);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [applications, setApplications] = useState(initialApplications);
  const [scores, setScores] = useState(initialScores);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const [editingCriteria, setEditingCriteria] = useState(initialCriteria.length === 0);
  const [criteriaDraft, setCriteriaDraft] = useState<GDCriterion[]>(
    initialCriteria.length ? initialCriteria : [newCriterion()]
  );
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  async function switchSubdomain(next: string) {
    const value = next as Subdomain;
    setSubdomain(value);
    setLoadingBoard(true);
    try {
      const res = await fetch(`/api/gd-board?subdomain=${encodeURIComponent(value)}`);
      const data = await res.json();
      setCriteria(data.criteria);
      setCriteriaDraft(data.criteria.length ? data.criteria : [newCriterion()]);
      setEditingCriteria(data.criteria.length === 0);
      setApplications(data.applications);
      setScores(data.scores);
      setAttendance(data.attendance);
      setDrafts({});
      setRowError({});
    } finally {
      setLoadingBoard(false);
    }
  }

  async function toggleAttendance(applicationId: string) {
    const next = !attendance[applicationId];
    setAttendance((prev) => ({ ...prev, [applicationId]: next })); // optimistic
    try {
      const res = await fetch(`/api/applications/${applicationId}/gd-score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAttendance((prev) => ({ ...prev, [applicationId]: !next })); // revert
    }
  }

  function getScore(applicationId: string, criterionId: string): number | undefined {
    if (drafts[applicationId]?.[criterionId] !== undefined) return drafts[applicationId][criterionId];
    return scores[applicationId]?.find((s) => s.criterionId === criterionId)?.score;
  }

  function setDraftScore(applicationId: string, criterionId: string, value: number) {
    const clamped = Math.max(1, Math.min(10, Math.round(value)));
    setDrafts((prev) => ({ ...prev, [applicationId]: { ...prev[applicationId], [criterionId]: clamped } }));
  }

  function isRowDirty(applicationId: string): boolean {
    return Object.keys(drafts[applicationId] ?? {}).length > 0;
  }

  function rowPercentage(applicationId: string): number | null {
    if (criteria.length === 0) return null;
    let total = 0;
    let count = 0;
    for (const c of criteria) {
      const v = getScore(applicationId, c.id);
      if (v !== undefined) {
        total += v;
        count++;
      }
    }
    if (count === 0) return null;
    return Math.round((total / (count * 10)) * 100);
  }

  async function saveRow(applicationId: string) {
    setSavingRow(applicationId);
    setRowError((prev) => ({ ...prev, [applicationId]: "" }));
    const rowScores: GDCriterionScore[] = criteria
      .map((c) => {
        const score = getScore(applicationId, c.id);
        return score !== undefined ? { criterionId: c.id, score } : null;
      })
      .filter((s): s is GDCriterionScore => s !== null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/gd-score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: rowScores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setScores((prev) => ({ ...prev, [applicationId]: data.score.scores }));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[applicationId];
        return next;
      });
    } catch (err) {
      setRowError((prev) => ({ ...prev, [applicationId]: err instanceof Error ? err.message : "Failed to save" }));
    } finally {
      setSavingRow(null);
    }
  }

  function updateCriterionDraft(id: string, label: string) {
    setCriteriaDraft((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  }

  function addCriterionDraft() {
    if (criteriaDraft.length >= 15) return;
    setCriteriaDraft((prev) => [...prev, newCriterion()]);
  }

  function removeCriterionDraft(id: string) {
    setCriteriaDraft((prev) => prev.filter((c) => c.id !== id));
  }

  async function saveCriteria() {
    setCriteriaError(null);
    const cleaned = criteriaDraft.filter((c) => c.label.trim().length > 0);
    if (cleaned.length === 0) {
      setCriteriaError("Add at least one criterion.");
      return;
    }
    setSavingCriteria(true);
    try {
      const res = await fetch("/api/gd-criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, criteria: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      // Re-fetch the board — criterion ids get normalized server-side, and
      // any stale scores against removed criteria are dropped there too.
      await switchSubdomain(subdomain);
      setEditingCriteria(false);
    } catch (err) {
      setCriteriaError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingCriteria(false);
    }
  }

  return (
    <div className="space-y-6">
      {editableSubdomains.length > 1 && (
        <div className="max-w-xs space-y-2">
          <Label>Subdomain</Label>
          <Select value={subdomain} onValueChange={switchSubdomain} disabled={loadingBoard}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {editableSubdomains.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loadingBoard ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 break-words text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Evaluation criteria — {subdomain}
                </p>
                {!editingCriteria && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingCriteria(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>

              {editingCriteria ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {criteriaDraft.map((c) => (
                      <div key={c.id} className="flex w-full items-center gap-1.5 sm:w-auto">
                        <Input
                          value={c.label}
                          onChange={(e) => updateCriterionDraft(c.id, e.target.value)}
                          placeholder="e.g. Clarity of Thought"
                          className="h-9 w-full sm:w-44"
                        />
                        {criteriaDraft.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-on-surface-variant hover:text-destructive"
                            onClick={() => removeCriterionDraft(c.id)}
                            aria-label="Remove criterion"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addCriterionDraft} disabled={criteriaDraft.length >= 15}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  {criteriaError && <p className="text-xs text-destructive">{criteriaError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveCriteria} disabled={savingCriteria}>
                      {savingCriteria ? "Saving…" : "Save criteria"}
                    </Button>
                    {criteria.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCriteriaDraft(criteria);
                          setEditingCriteria(false);
                          setCriteriaError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {criteria.map((c) => (
                    <span key={c.id} className="border-2 border-on-surface/10 px-3 py-1 text-xs font-medium text-on-surface">
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {applications.length === 0 && (
            <Card>
              <CardContent className="px-4 py-12 text-center text-on-surface-variant">
                No candidates moved to Group Discussion yet in this subdomain.
              </CardContent>
            </Card>
          )}

          {applications.length > 0 && criteria.length === 0 && (
            <Card>
              <CardContent className="px-4 py-8 text-center text-on-surface-variant">
                {applications.length} candidate{applications.length === 1 ? "" : "s"} in Group Discussion — add at
                least one criterion above to start scoring them.
              </CardContent>
            </Card>
          )}

          {applications.length > 0 && criteria.length > 0 && (
            <>
              {/* Mobile / narrow screens: one card per candidate, criteria stacked
                  vertically — a wide table forced into horizontal scroll here
                  would mean scrolling through a dozen tiny inputs one at a time,
                  which is worse than just stacking them. */}
              <div className="space-y-3 md:hidden">
                {applications.map((a) => {
                  const dirty = isRowDirty(a.applicationId);
                  const pct = rowPercentage(a.applicationId);
                  return (
                    <Card key={a.applicationId}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/applications/${a.applicationId}`}
                              className="block truncate font-medium text-on-surface hover:text-primary"
                            >
                              {a.name}
                            </Link>
                            <div className="truncate text-xs text-on-surface-variant">{a.regNo}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-lg font-bold tabular-nums text-primary">
                              {pct !== null ? `${pct}%` : "—"}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-on-surface-variant">overall</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAttendance(a.applicationId)}
                          className={`h-9 w-full border-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                            attendance[a.applicationId]
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                              : "border-destructive/40 bg-destructive/10 text-red-400"
                          }`}
                        >
                          {attendance[a.applicationId] ? "Present" : "Absent — tap to mark present"}
                        </button>

                        <div className="grid grid-cols-2 gap-2.5">
                          {criteria.map((c) => (
                            <div key={c.id} className="space-y-1">
                              <label className="block truncate text-xs text-on-surface-variant">{c.label}</label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={getScore(a.applicationId, c.id) ?? ""}
                                onChange={(e) => {
                                  if (e.target.value === "") return;
                                  setDraftScore(a.applicationId, c.id, Number(e.target.value));
                                }}
                                placeholder="—"
                                className="h-10 w-full border-2 border-on-surface/15 bg-transparent text-center text-sm text-on-surface focus:outline-none focus:border-primary"
                              />
                            </div>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant={dirty ? "default" : "outline"}
                          disabled={!dirty || savingRow === a.applicationId}
                          onClick={() => saveRow(a.applicationId)}
                          className="w-full"
                        >
                          {savingRow === a.applicationId ? "Saving…" : "Save"}
                        </Button>
                        {rowError[a.applicationId] && <p className="text-xs text-destructive">{rowError[a.applicationId]}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Tablet and up: dense table, one row per candidate. Still
                  horizontally scrollable for subdomains with many criteria. */}
              <Card className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-on-surface/10 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <th className="sticky left-0 min-w-[180px] bg-surface-container-lowest px-4 py-3 font-bold">
                        Candidate
                      </th>
                      <th className="min-w-[110px] px-3 py-3 text-center font-bold">Attendance</th>
                      {criteria.map((c) => (
                        <th key={c.id} className="min-w-[100px] px-3 py-3 text-center font-bold">
                          {c.label}
                        </th>
                      ))}
                      <th className="min-w-[90px] px-3 py-3 text-center font-bold">Overall</th>
                      <th className="min-w-[90px] px-3 py-3 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a) => {
                      const dirty = isRowDirty(a.applicationId);
                      const pct = rowPercentage(a.applicationId);
                      return (
                        <tr key={a.applicationId} className="border-b border-on-surface/10 last:border-0 hover:bg-surface-container transition-colors">
                          <td className="sticky left-0 min-w-[180px] bg-surface-container-lowest px-4 py-3">
                            <Link
                              href={`/applications/${a.applicationId}`}
                              className="block truncate font-medium text-on-surface hover:text-primary"
                            >
                              {a.name}
                            </Link>
                            <div className="truncate text-xs text-on-surface-variant">{a.regNo}</div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleAttendance(a.applicationId)}
                              className={`h-8 w-full border-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                attendance[a.applicationId]
                                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                                  : "border-destructive/40 bg-destructive/10 text-red-400"
                              }`}
                            >
                              {attendance[a.applicationId] ? "Present" : "Absent"}
                            </button>
                          </td>
                          {criteria.map((c) => (
                            <td key={c.id} className="px-3 py-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={getScore(a.applicationId, c.id) ?? ""}
                                onChange={(e) => {
                                  if (e.target.value === "") return;
                                  setDraftScore(a.applicationId, c.id, Number(e.target.value));
                                }}
                                placeholder="—"
                                className="h-9 w-14 border-2 border-on-surface/15 bg-transparent text-center text-sm text-on-surface focus:outline-none focus:border-primary"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center font-bold tabular-nums text-primary">
                            {pct !== null ? `${pct}%` : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || savingRow === a.applicationId} onClick={() => saveRow(a.applicationId)}>
                              {savingRow === a.applicationId ? "Saving…" : "Save"}
                            </Button>
                            {rowError[a.applicationId] && (
                              <p className="mt-1 text-xs text-destructive">{rowError[a.applicationId]}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

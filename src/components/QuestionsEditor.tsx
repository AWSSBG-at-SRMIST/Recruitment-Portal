"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuestionDef, Subdomain } from "@/types";

function emptyQuestion(): QuestionDef {
  return { id: "", label: "", placeholder: "", type: "textarea" };
}

export function QuestionsEditor({
  editableSubdomains,
  initialSubdomain,
  initialQuestions,
}: {
  editableSubdomains: Subdomain[];
  initialSubdomain: Subdomain;
  initialQuestions: QuestionDef[];
}) {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState(initialSubdomain);
  const [questions, setQuestions] = useState<QuestionDef[]>(initialQuestions);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchSubdomain(next: string) {
    const value = next as Subdomain;
    setSubdomain(value);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/questions?subdomain=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load questions");
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<QuestionDef>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  function addQuestion() {
    if (questions.length >= 10) return;
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  async function save() {
    setError(null);
    if (questions.length === 0) {
      setError("Add at least one question before saving.");
      return;
    }
    for (const q of questions) {
      if (!q.id.trim() || !q.label.trim()) {
        setError("Every question needs an id and a label.");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {editableSubdomains.length > 1 && (
        <div className="max-w-xs space-y-2">
          <Label>Subdomain</Label>
          <Select value={subdomain} onValueChange={switchSubdomain}>
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Question {i + 1}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)} disabled={questions.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Question id</Label>
                    <Input
                      value={q.id}
                      placeholder="e.g. project"
                      onChange={(e) => updateQuestion(i, { id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Answer type</Label>
                    <Select value={q.type} onValueChange={(v) => updateQuestion(i, { type: v as QuestionDef["type"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short text</SelectItem>
                        <SelectItem value="textarea">Long answer</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Question label (shown to the applicant)</Label>
                  <Textarea
                    value={q.label}
                    className="min-h-[60px]"
                    onChange={(e) => updateQuestion(i, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Placeholder (optional hint)</Label>
                  <Input
                    value={q.placeholder ?? ""}
                    onChange={(e) => updateQuestion(i, { placeholder: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addQuestion} disabled={questions.length >= 10}>
            <Plus className="h-4 w-4" /> Add question
          </Button>

          <div>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save questions"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

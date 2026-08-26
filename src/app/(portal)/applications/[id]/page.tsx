import type { Metadata } from "next";
import type { QuestionDef } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, GitBranch, Code2, Sparkles, Star, Award } from "lucide-react";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canChangeStatus, canViewApplication } from "@/lib/permissions";
import { sanitizeUrl } from "@/lib/validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusChanger } from "@/components/StatusChanger";
import { DeleteApplicationButton } from "@/components/DeleteApplicationButton";
import { RadarChart } from "@/components/RadarChart";
import { ScoreGauge } from "@/components/ScoreGauge";

export const metadata: Metadata = { title: "Application" };
export const dynamic = "force-dynamic";

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const app = await repo.getApplication(id);
  if (!app) notFound();
  if (!canViewApplication(user, app)) notFound();

  const questions = await repo.getSubdomainQuestions(app.subdomain);
  const canEditStatus = canChangeStatus(user, app);
  const signals = app.verifiedSignals;
  const evaluation = app.aiEvaluation;

  // For Technical candidates, split detected skills into "verified on GitHub"
  // vs "claimed only" — the inflation-aware view from Hiresense.
  const ghLangs = new Set(Object.keys(signals?.githubLanguages ?? {}).map((l) => l.toLowerCase()));
  const detected = evaluation?.detectedSkills ?? [];
  const verifiedSkills = detected.filter((s) => ghLangs.has(s.toLowerCase().replace("golang", "go")));
  const claimedSkills = detected.filter((s) => !verifiedSkills.includes(s));

  return (
    <div className="space-y-6">
      <Link href="/applications" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display break-words text-3xl font-bold text-on-surface">{app.name}</h1>
          <p className="mt-1 text-on-surface-variant">
            {app.domain} · {app.subdomain}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
            <Badge variant="outline">{app.regNo}</Badge>
            <Badge variant="outline">{app.gender}</Badge>
            <Badge variant="outline">{app.year}</Badge>
            <Badge variant="outline">{app.degree}</Badge>
            {app.awsCertLinks.length > 0 && (
              <Badge variant="success">
                <Award className="mr-1 h-3 w-3" /> {app.awsCertLinks.length} AWS cert
                {app.awsCertLinks.length > 1 ? "s" : ""}
              </Badge>
            )}
            {signals?.inflationFlag && <Badge variant="warning">⚠ Resume inflation</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {canEditStatus ? (
            <StatusChanger applicationId={app.applicationId} current={app.status} />
          ) : (
            <Badge variant="secondary" className="self-start sm:self-end">
              {app.status}
            </Badge>
          )}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <a href={`/api/applications/${app.applicationId}/resume`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> View resume
              </Button>
            </a>
            {canEditStatus && <DeleteApplicationButton applicationId={app.applicationId} />}
          </div>
        </div>
      </div>

      {/* AI verdict banner */}
      {evaluation && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" /> AI Hire Verdict
              <Badge variant="outline" className="ml-1">GROQ</Badge>
            </div>
            <p className="break-words text-sm leading-relaxed text-on-surface">{evaluation.recommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Score / summary / radar */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={app.aiScore} verdict={evaluation?.verdictLabel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words text-sm text-on-surface-variant">
              {evaluation?.executiveSummary || "No summary available."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competency Radar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {evaluation?.competencies?.length ? (
              <RadarChart data={evaluation.competencies} />
            ) : (
              <p className="text-sm text-on-surface-variant">No competency data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strengths / concerns */}
      {evaluation && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-emerald-400">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-emerald-400">+</span>
                    <span className="break-words">{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-amber-400">Concerns</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {evaluation.concerns.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-amber-400">–</span>
                    <span className="break-words">{c}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Skill geography */}
      {detected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detected Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {app.domain === "Technical" && verifiedSkills.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  Verified on GitHub
                </p>
                <div className="flex flex-wrap gap-2">
                  {verifiedSkills.map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {app.domain === "Technical" && verifiedSkills.length > 0 ? "Claimed" : "Skills & Tools"}
              </p>
              <div className="flex flex-wrap gap-2">
                {claimedSkills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GitHub activity + contact + leetcode */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="SRM email" value={app.collegeEmail} />
            <Row label="Personal" value={app.personalEmail} />
            <Row label="Phone" value={app.phone} />
            {app.dob && <Row label="DOB" value={app.dob} />}
            <div className="flex flex-col gap-1 pt-1">
              {app.linkedin && (
                <a
                  href={app.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {app.portfolioUrl && (
                <a
                  href={app.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Portfolio
                </a>
              )}
            </div>
            {app.githubUsername && (
              <a
                href={`https://github.com/${app.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 break-all text-primary hover:underline"
              >
                <GitBranch className="h-3.5 w-3.5 shrink-0" /> {app.githubUsername}
              </a>
            )}
            {app.leetcodeUsername && (
              <a
                href={`https://leetcode.com/u/${app.leetcodeUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Code2 className="h-3.5 w-3.5" /> {app.leetcodeUsername}
              </a>
            )}
          </CardContent>
        </Card>

        {signals && (signals.githubPublicRepos !== undefined || signals.githubSubScores) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" /> GitHub Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="public repos" value={String(signals.githubPublicRepos ?? 0)} />
                <Stat
                  label="stars"
                  value={String(signals.githubTotalStars ?? 0)}
                  icon={<Star className="h-3 w-3" />}
                />
                <Stat label="followers" value={String(signals.githubFollowers ?? 0)} />
                <Stat label="last active" value={timeAgo(signals.githubLastActive)} />
              </div>
              {signals.githubSubScores && (
                <div className="space-y-2 pt-1">
                  <SubScore label="Tech Breadth" value={signals.githubSubScores.techBreadth} />
                  <SubScore label="Project Depth" value={signals.githubSubScores.projectDepth} />
                  <SubScore label="Recency" value={signals.githubSubScores.recency} />
                </div>
              )}
              {signals.githubLanguages && Object.keys(signals.githubLanguages).length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-on-surface-variant">Top languages</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(signals.githubLanguages)
                      .slice(0, 6)
                      .map((l) => (
                        <Badge key={l} variant="secondary">{l}</Badge>
                      ))}
                  </div>
                </div>
              )}
              {signals.leetcodeSolved && (
                <div className="border-t border-on-surface/10 pt-3 text-sm">
                  <span className="text-on-surface-variant">LeetCode: </span>
                  Easy {signals.leetcodeSolved.easy} · Medium {signals.leetcodeSolved.medium} · Hard{" "}
                  {signals.leetcodeSolved.hard}
                  {signals.leetcodeRanking ? ` · rank ${signals.leetcodeRanking.toLocaleString()}` : ""}
                </div>
              )}
              {signals.inflationFlag && (
                <div className="border-2 border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                  ⚠ {signals.inflationNote}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* AWS certifications */}
      {app.awsCertLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-emerald-400" /> AWS Certifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {app.awsCertLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Certificate {i + 1}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Questionnaire */}
      <Card>
        <CardHeader>
          <CardTitle>Questionnaire responses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="min-w-0 border-2 border-on-surface/10 bg-surface-container/40 p-4">
              <p className="flex gap-2 text-sm font-semibold text-on-surface">
                <span className="shrink-0 text-primary">{i + 1}.</span>
                <span className="break-words">{q.label}</span>
              </p>
              <div className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                <AnswerText type={q.type} value={app.questionnaire[q.id]} />
              </div>
            </div>
          ))}
          {/* Answers stored under a question id the subdomain's current
              questions no longer have — e.g. this application was submitted
              before a Manager edited the questionnaire. Never let a real
              answer silently disappear. */}
          {Object.entries(app.questionnaire)
            .filter(([id, answer]) => answer?.trim() && !questions.some((q) => q.id === id))
            .map(([id, answer]) => (
              <div key={id} className="min-w-0 border-2 border-amber-500/30 bg-amber-500/5 p-4">
                <p className="break-words text-sm font-semibold text-amber-400">
                  {id} <span className="italic font-normal text-on-surface-variant">(question since changed/removed)</span>
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant">
                  {answer}
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

// A "link" question can hold one URL or several pipe-separated ones (the
// apply form's convention, e.g. "link1 | link2 | link3"). Only pieces that
// actually look like a URL get turned into clickable links — plain text
// like "not available" is left as-is rather than becoming a broken link.
const URL_LIKE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;

function AnswerText({ type, value }: { type: QuestionDef["type"]; value: string | undefined }) {
  const trimmed = value?.trim();
  if (!trimmed) return <span className="italic">No answer</span>;

  if (type !== "link") {
    return <p className="whitespace-pre-wrap break-words">{trimmed}</p>;
  }

  const pieces = trimmed.split("|").map((p) => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      {pieces.map((piece, i) =>
        URL_LIKE.test(piece) ? (
          <a
            key={i}
            href={sanitizeUrl(piece) ?? piece}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 break-all text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {piece}
          </a>
        ) : (
          <span key={i} className="break-words">{piece}</span>
        )
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="break-all text-on-surface">{value}</p>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="border-2 border-on-surface/10 bg-surface-container/40 p-3">
      <div className="flex items-center gap-1 text-xl font-bold tabular-nums text-on-surface">
        {icon}
        {value}
      </div>
      <div className="text-xs text-on-surface-variant">{label}</div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-on-surface-variant">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-primary-light" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-on-surface-variant">{value}</span>
    </div>
  );
}

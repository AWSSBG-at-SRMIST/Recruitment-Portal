"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, CheckCircle2, FileText, Lock, Sparkles, Loader2 } from "lucide-react";
import { SiInstagram, SiMeetup, SiWhatsapp } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CornerBrackets } from "@/components/ui/CornerBrackets";
import {
  ALL_DOMAINS,
  DOMAIN_SUBDOMAINS,
  YEAR_OPTIONS,
  DEPARTMENT_OPTIONS,
  GENDER_OPTIONS,
  type Domain,
  type Subdomain,
  type QuestionDef,
} from "@/types";

function Req() {
  return <span className="text-red-400"> *</span>;
}

// Club's own social pages to follow — GitHub isn't here since that's already
// a required field above, and WhatsApp is skipped since joining a group chat
// has no per-candidate username to collect as proof.
const INSTAGRAM_URL = "https://www.instagram.com/awssbg.at.srmist/";
const LINKEDIN_URL = "https://www.linkedin.com/company/awssbg-at-srmist";
const MEETUP_URL = "https://www.meetup.com/awssbg-at-srmist/";
const RECRUITMENT_GROUP_URL = "https://chat.whatsapp.com/GGQ5IJoMMdq5Ct9wkW0nFf";
// Vercel rejects request bodies over ~4.5MB at the platform level with no
// usable error — check client-side too so an oversized PDF is caught the
// moment it's picked, not after a mysterious failed submit.
const MAX_RESUME_BYTES = 4 * 1024 * 1024;

function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-on-surface/10 bg-surface-container-lowest p-5 card-shadow sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-primary text-xs font-bold text-primary">
          {step}
        </span>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">{title}</p>
      </div>
      {subtitle && <p className="mt-1 pl-9 text-xs text-on-surface-variant">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export function ApplyChatClient({ collegeEmail, initialName }: { collegeEmail: string; initialName?: string }) {
  // ── Identity & contact (real form fields) ──────────────────────────────
  const [name, setName] = useState(initialName ?? "");
  const [regNo, setRegNo] = useState("");
  const [gender, setGender] = useState("");
  const [year, setYear] = useState("");
  const [degree, setDegree] = useState("");
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [domain, setDomain] = useState<Domain | "">("");
  const [subdomain, setSubdomain] = useState<Subdomain | "">("");
  const [linkedin, setLinkedin] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [awsCertLink1, setAwsCertLink1] = useState("");
  const [awsCertLink2, setAwsCertLink2] = useState("");
  const [awsCertLink3, setAwsCertLink3] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [instagramChecked, setInstagramChecked] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState("");
  const [meetupChecked, setMeetupChecked] = useState(false);
  const [meetupUsername, setMeetupUsername] = useState("");
  const [followedLinkedin, setFollowedLinkedin] = useState(false);
  const [joinedRecruitmentGroup, setJoinedRecruitmentGroup] = useState(false);

  // ── Subdomain questionnaire (plain form) ───────────────────────────────
  const [questions, setQuestions] = useState<QuestionDef[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Fetching the subdomain's questions needs the subdomain — reload fresh
  // whenever the candidate changes their domain/subdomain choice.
  useEffect(() => {
    if (!subdomain) return;
    let cancelled = false;
    // Standard cancelled-flag data-fetching effect (per React's own docs) —
    // setting loading/reset state before the fetch starts is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestionsLoading(true);
    setQuestionnaire({});
    fetch(`/api/subdomain-questions?subdomain=${encodeURIComponent(subdomain)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setQuestions(data.questions ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this subdomain's questions. Please refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setQuestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  // Vacuously true when a subdomain has zero configured questions — the
  // server has no such requirement either, so this must never permanently
  // block submission just because getSubdomainQuestions returned [].
  const readyToSubmit =
    !!subdomain && !questionsLoading && questions.every((q) => !!questionnaire[q.id]?.trim());

  function updateAnswer(id: string, value: string) {
    setQuestionnaire((qs) => ({ ...qs, [id]: value }));
  }

  function handleDomainChange(v: string) {
    setDomain(v as Domain);
    setSubdomain("");
  }

  const identityValid =
    !!name.trim() &&
    !!regNo.trim() &&
    !!gender &&
    !!year &&
    !!degree &&
    /^[6-9]\d{9}$/.test(phone.trim()) &&
    !!personalEmail.trim() &&
    !!domain &&
    !!subdomain &&
    !!linkedin.trim() &&
    !!githubLink.trim();
  // The "Follow Us" section is entirely optional, but a checked box needs
  // its username as proof — can't submit half-filled.
  const socialsValid =
    (!instagramChecked || !!instagramUsername.trim()) && (!meetupChecked || !!meetupUsername.trim());
  // Resume is optional for everyone.
  const resumeValid = !resumeError;

  function handleResumeChange(file: File | null) {
    if (file && file.size > MAX_RESUME_BYTES) {
      setResumeError("That PDF is over 4 MB — please compress it and re-attach.");
      setResume(null);
      return;
    }
    setResumeError(null);
    setResume(file);
  }
  const canSubmit =
    identityValid && socialsValid && resumeValid && readyToSubmit && joinedRecruitmentGroup && !submitting;

  async function submitApplication() {
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("regNo", regNo.trim());
      form.set("gender", gender);
      form.set("year", year);
      form.set("degree", degree);
      form.set("phone", phone.trim());
      form.set("personalEmail", personalEmail.trim());
      form.set("domain", domain);
      form.set("subdomain", subdomain);
      form.set("linkedin", linkedin.trim());
      form.set("githubUsername", githubLink.trim());
      if (portfolioUrl.trim()) form.set("portfolioUrl", portfolioUrl.trim());
      [awsCertLink1, awsCertLink2, awsCertLink3].forEach((l, i) => {
        if (l.trim()) form.set(`awsCertLink${i + 1}`, l.trim());
      });
      for (const [id, ans] of Object.entries(questionnaire)) form.set(`q_${id}`, ans);
      form.set("instagramFollowed", String(instagramChecked));
      if (instagramChecked) form.set("instagramUsername", instagramUsername.trim());
      form.set("meetupFollowed", String(meetupChecked));
      if (meetupChecked) form.set("meetupUsername", meetupUsername.trim());
      form.set("followedLinkedin", String(followedLinkedin));
      form.set("joinedRecruitmentGroup", String(joinedRecruitmentGroup));
      if (resume) form.set("resume", resume);

      const res = await fetch("/api/applications", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="relative max-w-md border-2 border-on-surface/10 bg-surface-container-lowest p-10 text-center card-shadow">
          <CornerBrackets />
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="font-display mb-2 text-2xl font-bold text-on-surface">Application submitted</h1>
          <p className="mb-6 text-on-surface-variant">
            Nice work — we&apos;ve got your application. The AWS SBG at SRMIST recruitment team will review
            it. Watch your college email.
          </p>
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          ← Home
        </Link>
        <h1 className="font-display text-lg font-bold text-on-surface">Application</h1>
      </div>

      <p className="mb-6 text-center text-xs text-on-surface-variant">
        Facing an issue applying? Contact{" "}
        <a href="tel:+917498511482" className="font-bold text-primary hover:underline">
          Samidha Lade (+91 7498 511 482)
        </a>{" "}
        or{" "}
        <a href="tel:+919289506696" className="font-bold text-primary hover:underline">
          Krish Pundir (+91 92895 06696)
        </a>
        .
      </p>

      <div className="space-y-5">
        <SectionCard step={1} title="Your Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name
                <Req />
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="regNo">
                Registration No.
                <Req />
              </Label>
              <Input
                id="regNo"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="RA2511003011411 (2025/2026 batch only)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender-select">
                Gender
                <Req />
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender-select" className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-select">
                Year
                <Req />
              </Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year-select" className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="degree-select">
                Department
                <Req />
              </Label>
              <Select value={degree} onValueChange={setDegree}>
                <SelectTrigger id="degree-select" className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone
                <Req />
              </Label>
              <div className="flex h-10 items-stretch border-2 border-on-surface/10 bg-surface-container-lowest focus-within:border-primary">
                <span className="flex items-center border-r-2 border-on-surface/10 px-3 text-sm font-bold text-on-surface-variant">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full min-w-0 bg-transparent px-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="personalEmail">
                Personal Email
                <Req />
              </Label>
              <Input
                id="personalEmail"
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="you@gmail.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="srmEmail">SRM Email</Label>
            <div
              id="srmEmail"
              className="flex h-10 w-full items-center gap-2 border-2 border-on-surface/10 bg-surface-container px-4 text-sm text-on-surface-variant"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {collegeEmail}
            </div>
          </div>
        </SectionCard>

        <SectionCard step={2} title="Domain & Links">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="domain-select">
                Domain
                <Req />
              </Label>
              <Select value={domain} onValueChange={handleDomainChange}>
                <SelectTrigger id="domain-select" className="w-full">
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subdomain-select">
                Subdomain
                <Req />
              </Label>
              <Select value={subdomain} onValueChange={(v) => setSubdomain(v as Subdomain)} disabled={!domain}>
                <SelectTrigger id="subdomain-select" className="w-full">
                  <SelectValue placeholder={domain ? "Select subdomain" : "Pick a domain first"} />
                </SelectTrigger>
                <SelectContent>
                  {(domain ? DOMAIN_SUBDOMAINS[domain] : []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">
              LinkedIn Profile
              <Req />
            </Label>
            <Input
              id="linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/yourname"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="github">
                GitHub Link
                <Req />
              </Label>
              <Input
                id="github"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                placeholder="https://github.com/yourusername"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input
                id="portfolio"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>AWS Certification Links (up to 3, optional)</Label>
            <div className="space-y-2">
              <Input
                value={awsCertLink1}
                onChange={(e) => setAwsCertLink1(e.target.value)}
                placeholder="credly.com/badges/..."
              />
              <Input
                value={awsCertLink2}
                onChange={(e) => setAwsCertLink2(e.target.value)}
                placeholder="credly.com/badges/..."
              />
              <Input
                value={awsCertLink3}
                onChange={(e) => setAwsCertLink3(e.target.value)}
                placeholder="credly.com/badges/..."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          step={3}
          title="Subdomain Questions"
          subtitle={subdomain ? undefined : "Pick a domain and subdomain above to see your questions."}
        >
          {!subdomain ? (
            <p className="text-sm text-on-surface-variant">Waiting for domain and subdomain…</p>
          ) : questionsLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
            </div>
          ) : (
            <>
              {questions.length > 0 && (
                <div
                  className={`mb-2 flex w-fit items-center gap-1.5 border-2 px-2.5 py-1 text-xs font-bold ${
                    readyToSubmit ? "border-emerald-400 text-emerald-400" : "border-on-surface/15 text-on-surface-variant"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {questions.filter((q) => !!questionnaire[q.id]?.trim()).length}/{questions.length} answered
                </div>
              )}
              {questions.map((q, i) => (
                <div key={q.id} className="space-y-1.5">
                  <Label htmlFor={`q-${q.id}`}>
                    {i + 1}. {q.label}
                    <Req />
                  </Label>
                  {q.type === "textarea" ? (
                    <Textarea
                      id={`q-${q.id}`}
                      value={questionnaire[q.id] ?? ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <Input
                      id={`q-${q.id}`}
                      value={questionnaire[q.id] ?? ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      placeholder={
                        q.type === "link" ? q.placeholder || "https://..." : q.placeholder
                      }
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </SectionCard>

        <SectionCard
          step={4}
          title="Resume"
          subtitle="Optional — attach one if you have it. PDF, max 4 MB."
        >
          <label className="flex cursor-pointer items-center gap-2 border-2 border-dashed border-on-surface/20 p-3 text-sm hover:bg-surface-container">
            <Upload className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-on-surface-variant">{resume ? resume.name : "Click to attach (PDF, max 4 MB)"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleResumeChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {resume && (
            <p className="flex items-center gap-1 text-xs text-emerald-400">
              <FileText className="h-3 w-3" /> Attached ({(resume.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}
          {resumeError && <p className="text-xs text-red-400">{resumeError}</p>}
        </SectionCard>

        <div className="border-2 border-dashed border-primary/30 bg-surface-container-lowest p-5 card-shadow sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">
              Follow Us <span className="normal-case text-on-surface-variant">(+1 point each)</span>
            </p>
          </div>
          <p className="mt-1 pl-7 text-xs text-on-surface-variant">
            Earn 1 bonus point for every social you follow — up to 3 extra points. 😄
          </p>

          <div className="mt-4 space-y-4">
            {/* Instagram */}
            <div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={instagramChecked}
                  onChange={(e) => setInstagramChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <SiInstagram className="h-4 w-4 shrink-0 text-primary" /> I follow{" "}
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @awssbg.at.srmist
                  </a>{" "}
                  on Instagram
                </span>
              </label>
              {instagramChecked && (
                <Input
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value)}
                  placeholder="Your Instagram username"
                  className="mt-2 ml-6 max-w-xs"
                />
              )}
            </div>

            {/* Meetup */}
            <div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={meetupChecked}
                  onChange={(e) => setMeetupChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <SiMeetup className="h-4 w-4 shrink-0 text-primary" /> I&apos;ve joined our{" "}
                  <a
                    href={MEETUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Meetup group
                  </a>
                </span>
              </label>
              {meetupChecked && (
                <Input
                  value={meetupUsername}
                  onChange={(e) => setMeetupUsername(e.target.value)}
                  placeholder="Your Meetup username"
                  className="mt-2 ml-6 max-w-xs"
                />
              )}
            </div>

            {/* LinkedIn — no per-candidate username to collect for a company-page follow */}
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={followedLinkedin}
                onChange={(e) => setFollowedLinkedin(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <FaLinkedin className="h-4 w-4 shrink-0 text-primary" /> I follow AWS SBG&apos;s{" "}
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  LinkedIn page
                </a>
              </span>
            </label>
          </div>
        </div>

        <div className="border-2 border-primary bg-primary/5 p-5 card-shadow sm:p-6">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">
            Join Recruitments Group
            <Req />
          </p>
          <a
            href={RECRUITMENT_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <SiWhatsapp className="h-4 w-4 shrink-0" /> Join the Recruitments WhatsApp group
          </a>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={joinedRecruitmentGroup}
              onChange={(e) => setJoinedRecruitmentGroup(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            I&apos;ve joined the Recruitments WhatsApp group. (Required to submit)
          </label>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <Button variant="gradient" className="w-full" disabled={!canSubmit} onClick={submitApplication}>
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
        {!identityValid && (
          <p className="text-center text-xs text-on-surface-variant">
            Fill in every required field above (marked with *) to submit.
          </p>
        )}
        {identityValid && !socialsValid && (
          <p className="text-center text-xs text-amber-400">
            Add your username for any &quot;Follow Us&quot; box you checked, or uncheck it.
          </p>
        )}
        {identityValid && socialsValid && resumeValid && !readyToSubmit && (
          <p className="text-center text-xs text-on-surface-variant">
            Answer every subdomain question above to unlock submit.
          </p>
        )}
        {identityValid && socialsValid && !resumeValid && (
          <p className="text-center text-xs text-amber-400">Fix the resume file above to submit.</p>
        )}
        {identityValid && socialsValid && resumeValid && readyToSubmit && !joinedRecruitmentGroup && (
          <p className="text-center text-xs text-amber-400">
            Join the Recruitments WhatsApp group and check the box above to submit.
          </p>
        )}
      </div>
    </div>
  );
}

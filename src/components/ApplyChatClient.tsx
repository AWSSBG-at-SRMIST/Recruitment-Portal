"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Upload, CheckCircle2, Send, Bot, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/types";
import type { ChatMessage } from "@/lib/intake";

// Compact overrides so Nova's markdown (bold, lists, paragraphs) reads well
// inside a small chat bubble instead of the default block spacing.
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
};

function Req() {
  return <span className="text-red-400"> *</span>;
}

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
  const [githubUsername, setGithubUsername] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [awsCertLink1, setAwsCertLink1] = useState("");
  const [awsCertLink2, setAwsCertLink2] = useState("");
  const [awsCertLink3, setAwsCertLink3] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  // ── Subdomain questionnaire (Nova chat) ────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionnaire, setQuestionnaire] = useState<Record<string, string>>({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const chatSubdomain = useRef<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Starting the questionnaire chat needs the subdomain — restart it fresh
  // whenever the candidate changes their domain/subdomain choice.
  useEffect(() => {
    if (!subdomain || chatSubdomain.current === subdomain) return;
    chatSubdomain.current = subdomain;
    setMessages([]);
    setQuestionnaire({});
    setTotalQuestions(0);
    setReadyToSubmit(false);
    void send([], {}, subdomain);
  }, [subdomain]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (!thinking && !submitting && !done && subdomain) inputRef.current?.focus();
  }, [thinking, submitting, done, subdomain]);

  async function send(history: ChatMessage[], known: Record<string, string>, sd: string) {
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, questionnaire: known, subdomain: sd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The recruitment chatbot is unavailable.");
      setMessages([...history, { role: "assistant", content: data.message }]);
      setQuestionnaire(data.questionnaire ?? known);
      setReadyToSubmit(!!data.readyToSubmit);
      if (typeof data.totalQuestions === "number") setTotalQuestions(data.totalQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setThinking(false);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking || !subdomain) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    void send(history, questionnaire, subdomain);
  }

  function handleDomainChange(v: string) {
    setDomain(v as Domain);
    setSubdomain("");
  }

  const githubRequired = domain === "Technical";
  const identityValid =
    !!name.trim() &&
    !!regNo.trim() &&
    !!gender &&
    !!year &&
    !!degree &&
    !!phone.trim() &&
    !!personalEmail.trim() &&
    !!domain &&
    !!subdomain &&
    !!linkedin.trim() &&
    (!githubRequired || !!githubUsername.trim());
  const canSubmit = identityValid && readyToSubmit && !!resume && !submitting;

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
      if (githubUsername.trim()) form.set("githubUsername", githubUsername.trim());
      if (portfolioUrl.trim()) form.set("portfolioUrl", portfolioUrl.trim());
      [awsCertLink1, awsCertLink2, awsCertLink3].forEach((l, i) => {
        if (l.trim()) form.set(`awsCertLink${i + 1}`, l.trim());
      });
      for (const [id, ans] of Object.entries(questionnaire)) form.set(`q_${id}`, ans);
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
            Nice work — Nova has your application. The AWS SBG at SRMIST recruitment team will review
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
                placeholder="RA2311003011411"
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
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
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
                GitHub Username
                {githubRequired && <Req />}
              </Label>
              <Input
                id="github"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder={githubRequired ? "required for Technical" : "optional"}
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
          ) : (
            <div className="flex h-[420px] flex-col border-2 border-on-surface/10 bg-surface-container">
              <div className="flex items-center justify-between gap-3 border-b border-on-surface/10 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-light">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Nova</p>
                    <p className="text-[11px] text-on-surface-variant">AWS SBG at SRMIST recruitment chatbot</p>
                  </div>
                </div>
                {totalQuestions > 0 && (
                  <div
                    className={`flex items-center gap-1.5 border-2 px-2.5 py-1 text-xs font-bold ${
                      readyToSubmit ? "border-emerald-400 text-emerald-400" : "border-on-surface/15 text-on-surface-variant"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {Math.min(Object.values(questionnaire).filter((v) => v?.trim()).length, totalQuestions)}/
                    {totalQuestions}
                  </div>
                )}
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user"
                          ? "whitespace-pre-wrap bg-gradient-to-r from-brand-primary to-brand-primary-light text-white"
                          : "bg-surface-container-lowest text-on-surface"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <ReactMarkdown components={markdownComponents}>{m.content}</ReactMarkdown>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface-variant">
                      Nova is typing…
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="flex gap-2 border-t border-on-surface/10 p-2.5">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={thinking ? "Nova is typing…" : "Type your reply…"}
                  disabled={submitting}
                />
                <Button type="submit" variant="gradient" size="icon" disabled={thinking || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </SectionCard>

        <SectionCard step={4} title="Resume">
          <label className="flex cursor-pointer items-center gap-2 border-2 border-dashed border-on-surface/20 p-3 text-sm hover:bg-surface-container">
            <Upload className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-on-surface-variant">{resume ? resume.name : "Click to attach (PDF)"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            />
          </label>
          {resume && (
            <p className="flex items-center gap-1 text-xs text-emerald-400">
              <FileText className="h-3 w-3" /> Attached
            </p>
          )}
        </SectionCard>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <Button variant="gradient" className="w-full" disabled={!canSubmit} onClick={submitApplication}>
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
        {!identityValid && (
          <p className="text-center text-xs text-on-surface-variant">
            Fill in every required field above (marked with *) to submit.
          </p>
        )}
        {identityValid && !readyToSubmit && (
          <p className="text-center text-xs text-on-surface-variant">
            Finish chatting with Nova above to unlock submit.
          </p>
        )}
        {identityValid && readyToSubmit && !resume && (
          <p className="text-center text-xs text-amber-400">Attach your resume PDF to submit.</p>
        )}
      </div>
    </div>
  );
}

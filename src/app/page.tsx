import Link from "next/link";
import { ArrowRight, Users, Sparkles, Layers, Zap, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getRecruitmentStatus, getRecruitmentWindow, formatIst } from "@/lib/recruitment-window";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

// Status changes purely with wall-clock time, not any request input — must
// be evaluated fresh on every request, not baked in at build time.
export const dynamic = "force-dynamic";

const APPLY_CTA_LABEL: Record<string, string> = {
  before: "Opens Soon",
  open: "Apply Now",
  closed: "Applications Closed",
};

export default async function LandingPage() {
  const status = getRecruitmentStatus();
  const { opensAt, closesAt } = getRecruitmentWindow();
  const applyLabel = APPLY_CTA_LABEL[status];

  const user = await getCurrentUser();
  const account = user ? { name: user.name, href: isAdmin(user) ? "/dashboard" : "/apply" } : null;

  const heroHeading =
    status === "open" ? (
      <>
        Applications
        <br className="hidden sm:block" /> are open.
      </>
    ) : status === "before" ? (
      <>
        Applications
        <br className="hidden sm:block" /> open soon.
      </>
    ) : (
      <>
        Applications
        <br className="hidden sm:block" /> are closed.
      </>
    );

  const heroSubtext =
    status === "open"
      ? "Chat with Nova, our recruitment chatbot, to apply in a few minutes — no static form. Watch the video below to see what we're building first."
      : status === "before"
        ? `Applications open ${formatIst(opensAt)} IST. Watch the video below to see what we're building while you wait.`
        : `This recruitment cycle closed ${formatIst(closesAt)} IST. Watch the video below to see what we're building, and follow us for the next cycle.`;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(168,85,247,0.18), transparent 70%), radial-gradient(40% 40% at 80% 20%, rgba(217,70,239,0.12), transparent 70%)",
        }}
      />

      <Navbar account={account} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-container-max px-margin-mobile pt-28 pb-14 md:px-margin-desktop md:pt-32 md:pb-20">
          {/* HUD corner brackets framing the section, like the rest of the site */}
          <div className="pointer-events-none absolute top-6 left-0 hidden h-10 w-10 border-l-2 border-t-2 border-primary/40 lg:block" />
          <div className="pointer-events-none absolute top-6 right-0 hidden h-10 w-10 border-r-2 border-t-2 border-primary/40 lg:block" />

          <div className="w-full">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
              AWS Student Builder Group · SRMIST
            </p>
            <h1 className="font-display max-w-3xl text-[44px] font-bold leading-[0.95] tracking-tight text-on-surface sm:text-[64px] md:text-[84px]">
              {heroHeading}
            </h1>
            <p className="text-label-md mt-6 max-w-xl border-l-2 border-primary/40 pl-5 leading-relaxed text-on-surface-variant">
              {heroSubtext}
            </p>
            <Link href="/apply" className="mt-8 inline-block">
              <Button variant={status === "open" ? "default" : "outline"} size="lg">
                {applyLabel} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Video */}
        <section className="mx-auto max-w-container-max px-margin-mobile pb-14 md:px-margin-desktop">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">Club Overview</p>
          <div className="relative mx-auto max-w-4xl">
            <div className="pointer-events-none absolute -top-2 -left-2 z-10 h-5 w-5 border-l-2 border-t-2 border-primary" />
            <div className="pointer-events-none absolute -top-2 -right-2 z-10 h-5 w-5 border-r-2 border-t-2 border-primary" />
            <div className="pointer-events-none absolute -bottom-2 -left-2 z-10 h-5 w-5 border-b-2 border-l-2 border-primary" />
            <div className="pointer-events-none absolute -bottom-2 -right-2 z-10 h-5 w-5 border-b-2 border-r-2 border-primary" />

            <div className="overflow-hidden border-2 border-primary/25 bg-surface-container-lowest card-shadow">
              {/* Player chrome — gives the light Drive thumbnail somewhere to
                  sit instead of butting straight against the dark page. */}
              <div className="flex items-center gap-2 border-b-2 border-on-surface/10 bg-surface-container px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/20" />
                <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                  Inside AWS SBG at SRMIST
                </span>
              </div>
              <div className="bg-brand-dark p-3 sm:p-5">
                <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src="https://drive.google.com/file/d/1Vuqk1fP4r13lrJrwrMdXkHdII6olxHXk/preview"
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay"
                    title="What is AWS SBG at SRMIST?"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-4xl text-[10px] uppercase tracking-[0.25em] text-on-surface-variant/50">
            What is AWS SBG at SRMIST? — Club Overview
          </p>
        </section>

        {/* Info cards */}
        <section className="mx-auto max-w-container-max px-margin-mobile pb-20 md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-2 border-on-surface/10 bg-surface-container-lowest p-5">
              <Users className="mb-3 h-5 w-5 text-primary" />
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-primary">Open To</p>
              <p className="font-display text-xl font-bold leading-tight text-on-surface">
                CSE — 1st &amp; 2nd year.
              </p>
            </div>

            <div className="border-2 border-on-surface/10 bg-surface-container-lowest p-5">
              <Sparkles className="mb-3 h-5 w-5 text-primary" />
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-primary">Experience</p>
              <p className="text-base font-bold text-on-surface">None required.</p>
              <p className="mt-1 text-sm text-on-surface-variant">We build from zero, together.</p>
            </div>

            <div className="border-2 border-on-surface/10 bg-surface-container-lowest p-5">
              <Layers className="mb-3 h-5 w-5 text-primary" />
              <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-primary">Domains</p>
              <div className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-px w-4 bg-primary" />Technical
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-px w-4 bg-primary" />Corporate
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-px w-4 bg-primary" />Creatives
                </span>
              </div>
            </div>

            <div className="border-2 border-primary/40 bg-surface-container-lowest p-5">
              {status === "open" ? (
                <Zap className="mb-3 h-5 w-5 text-primary" />
              ) : status === "before" ? (
                <Clock className="mb-3 h-5 w-5 text-primary" />
              ) : (
                <Lock className="mb-3 h-5 w-5 text-primary" />
              )}
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-primary">Status</p>
              <p className="text-base font-bold text-on-surface">
                {status === "open" ? "Open now." : status === "before" ? "Opening soon." : "Closed."}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {status === "open"
                  ? "Pick a domain, chat with Nova, attach your resume — done in a few minutes."
                  : status === "before"
                    ? `Opens ${formatIst(opensAt)} IST.`
                    : `Closed ${formatIst(closesAt)} IST. See you next cycle.`}
              </p>
              <Link
                href="/apply"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary hover:underline"
              >
                {applyLabel} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

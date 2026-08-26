import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  BrainCircuit,
  Cloud,
  CalendarDays,
  Handshake,
  UserCog,
  Megaphone,
  Palette,
  Clapperboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getRecruitmentStatus, getRecruitmentWindow, formatIst } from "@/lib/recruitment-window";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export const metadata: Metadata = { title: "Domains" };

// Status changes purely with wall-clock time — must be evaluated fresh on
// every request, not baked in at build time (mirrors the home page).
export const dynamic = "force-dynamic";

interface SubdomainInfo {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TECHNICAL: SubdomainInfo[] = [
  {
    name: "Software Development",
    icon: Code2,
    description:
      "Builds and ships the club's actual products — this recruitment portal, the official website, the internal dashboard, and whatever we're building next. You write real production code, ship features, and fix real bugs, not toy assignments.",
  },
  {
    name: "AI & Machine Learning",
    icon: BrainCircuit,
    description:
      "Works on applied ML/AI projects and helps run workshops that teach the rest of the club. Model building, experimentation, and turning research into things that actually run — from data to a working result.",
  },
  {
    name: "Cloud & DevOps",
    icon: Cloud,
    description:
      "Owns the cloud infrastructure behind everything the club runs — AWS deployments, CI/CD pipelines, containers, and keeping our own apps (like this one) up and reliable. Hands-on, real infra, not just certifications.",
  },
];

const CORPORATE: SubdomainInfo[] = [
  {
    name: "Events & Operations",
    icon: CalendarDays,
    description:
      "Plans and executes the club's events — workshops, hackathons, meetups — from venue logistics to on-ground execution. Calm under pressure and good with a plan when things change last-minute.",
  },
  {
    name: "Sponsorship & Finance",
    icon: Handshake,
    description:
      "Sources sponsorships and partnerships, manages the club's budget, and handles outreach and negotiation with sponsors. Professional communication and business sense matter more here than jargon.",
  },
  {
    name: "HR & Admin",
    icon: UserCog,
    description:
      "Runs the club's internal operations — member onboarding, recruitment drives like this one, internal coordination, and the admin processes that keep everything else running smoothly.",
  },
  {
    name: "PR & Marketing",
    icon: Megaphone,
    description:
      "Owns the club's public image — social media, announcements, campaigns, and external communication. Creative, audience-aware, and comfortable writing copy that actually lands.",
  },
];

const CREATIVES: SubdomainInfo[] = [
  {
    name: "Digital Design",
    icon: Palette,
    description:
      "Designs the club's visual identity — event posters, social media graphics, and UI/UX for the club's own products. Tool fluency (Figma/Adobe) matters, but intent behind design choices matters more.",
  },
  {
    name: "Media Production",
    icon: Clapperboard,
    description:
      "Shoots and edits video/photo content — event coverage, reels, and promotional videos like the one on our home page. Craft (shooting, pacing, editing) and tool fluency (Premiere/DaVinci/After Effects) both count.",
  },
];

function DomainSection({
  eyebrow,
  title,
  blurb,
  subdomains,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  subdomains: SubdomainInfo[];
}) {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile pb-14 md:px-margin-desktop">
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h2 className="font-display mb-3 text-2xl font-bold text-on-surface sm:text-3xl">{title}</h2>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-on-surface-variant">{blurb}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subdomains.map(({ name, icon: Icon, description }) => (
          <div key={name} className="border-2 border-on-surface/10 bg-surface-container-lowest p-5 card-shadow">
            <Icon className="mb-3 h-5 w-5 text-primary" />
            <p className="font-display mb-2 text-base font-bold text-on-surface">{name}</p>
            <p className="text-sm leading-relaxed text-on-surface-variant">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DomainsPage() {
  const status = getRecruitmentStatus();
  const user = await getCurrentUser();
  const account = user ? { name: user.name, href: isAdmin(user) ? "/dashboard" : "/apply" } : null;
  const { opensAt, closesAt } = getRecruitmentWindow();

  const ctaLabel = status === "open" ? "Apply Now" : status === "before" ? "Opens Soon" : "Applications Closed";
  const ctaSubtext =
    status === "open"
      ? "Pick a domain and subdomain, chat with Nova, attach your resume — done in a few minutes."
      : status === "before"
        ? `Applications open ${formatIst(opensAt)} IST.`
        : `This recruitment cycle closed ${formatIst(closesAt)} IST. Follow us for the next cycle.`;

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
        <section className="mx-auto max-w-container-max px-margin-mobile pt-28 pb-10 md:px-margin-desktop md:pt-32">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">AWS Student Builder Group · SRMIST</p>
          <h1 className="font-display max-w-2xl text-[36px] font-bold leading-[0.95] tracking-tight text-on-surface sm:text-[48px] md:text-[56px]">
            Three domains.
            <br className="hidden sm:block" /> Nine ways to build.
          </h1>
          <p className="text-label-md mt-6 max-w-xl border-l-2 border-primary/40 pl-5 leading-relaxed text-on-surface-variant">
            Every subdomain below is a real team doing real work for the club — not a label. Read through
            before you pick one on the application.
          </p>
        </section>

        <DomainSection
          eyebrow="Domain 01"
          title="Technical"
          blurb="Builds the club's own products and infrastructure. Open to anyone who wants to write real code, ship real features, and learn by building — not by watching."
          subdomains={TECHNICAL}
        />
        <DomainSection
          eyebrow="Domain 02"
          title="Corporate"
          blurb="Keeps the club running — events, sponsorships, people, and outward-facing communication. Open to anyone who's organised, persuasive, or good with people."
          subdomains={CORPORATE}
        />
        <DomainSection
          eyebrow="Domain 03"
          title="Creatives"
          blurb="Shapes how the club looks and sounds — design and video, for everything from a single Instagram post to a full event recap."
          subdomains={CREATIVES}
        />

        <section className="mx-auto max-w-container-max px-margin-mobile pb-20 md:px-margin-desktop">
          <div className="border-2 border-primary/40 bg-surface-container-lowest p-6 text-center sm:p-8">
            <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-primary">Ready to build with us?</p>
            <p className="mb-4 text-sm text-on-surface-variant">{ctaSubtext}</p>
            <Link href="/apply" className="inline-block">
              <Button variant={status === "open" ? "gradient" : "outline"} size="lg">
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

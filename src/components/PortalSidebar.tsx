"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, HelpCircle, ClipboardCheck, MessagesSquare, Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import type { SessionUser } from "@/types";
import Logo from "../../public/logo.png";

const ROLE_LABELS: Record<string, string> = {
  SBG_LEADER: "SBG Leader",
  SECRETARY: "Secretary",
  DIRECTOR: "Director",
  MANAGER: "Manager",
  ASSOCIATE: "Associate",
  OBSERVER: "Faculty Mentor",
};

function scopeLabel(user: SessionUser): string {
  const role = user.role ? (ROLE_LABELS[user.role] ?? user.role) : "—";
  if (user.role === "SBG_LEADER" || user.role === "SECRETARY") return `${role} · All access`;
  if (user.role === "OBSERVER") return `${role} · View only`;
  if (user.role === "DIRECTOR") return `${role} · ${user.domain ?? "—"}`;
  return `${role} · ${user.subdomain ?? "—"}`;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function NavPanel({
  navItems,
  pathname,
  user,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  user: SessionUser;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b-2 border-on-surface/10 p-5">
        <Image src={Logo} alt="AWS Student Builder Group at SRMIST logo" className="h-8 w-8" />
        <div>
          <p className="text-sm font-bold tracking-wide text-on-surface">AWS SBG at SRMIST</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Recruitment</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 border-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-on-surface-variant hover:border-on-surface/10 hover:text-on-surface"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-on-surface/10 p-4">
        <p className="truncate text-sm font-bold text-on-surface">{user.name}</p>
        <p className="truncate text-xs text-on-surface-variant">{scopeLabel(user)}</p>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export function PortalSidebar({
  user,
  canSeeQuestionsNav,
  canSeeInterviewsNav,
  canSeeGDNav,
  children,
}: {
  user: SessionUser;
  canSeeQuestionsNav: boolean;
  canSeeInterviewsNav: boolean;
  canSeeGDNav: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/applications", label: "Applications", icon: <Users className="h-4 w-4" /> },
    ...(canSeeGDNav
      ? [{ href: "/gd", label: "Group Discussion", icon: <MessagesSquare className="h-4 w-4" /> }]
      : []),
    ...(canSeeInterviewsNav
      ? [{ href: "/interviews", label: "Interviews", icon: <ClipboardCheck className="h-4 w-4" /> }]
      : []),
    ...(canSeeQuestionsNav
      ? [{ href: "/questions", label: "Questions", icon: <HelpCircle className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 transform border-r-2 border-on-surface/10 bg-surface-container-lowest transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavPanel navItems={navItems} pathname={pathname} user={user} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r-2 border-on-surface/10 bg-surface-container-lowest lg:block">
        <div className="sticky top-0 h-screen">
          <NavPanel navItems={navItems} pathname={pathname} user={user} onNavigate={() => {}} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b-2 border-on-surface/10 bg-surface-container-lowest px-4 lg:hidden">
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="text-on-surface"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="text-sm font-bold tracking-wide text-on-surface">AWS SBG Recruitment</span>
        </header>

        <main className="mx-auto w-full max-w-container-max flex-1 px-margin-mobile py-8 md:px-margin-desktop">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import Logo from "../../public/logo.png";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/domains", label: "Domains" },
];

export function Navbar({ account }: { account?: { name: string; href: string } | null }) {
  const pathname = usePathname();

  const isLinkActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    isLinkActive(href)
      ? "text-primary font-semibold border-b-2 border-primary transition-all duration-300 hover:-translate-y-0.5 inline-block"
      : "text-on-surface-variant hover:text-primary transition-all duration-300 hover:-translate-y-0.5 inline-block relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-primary hover:after:scale-x-100 after:transition-transform after:duration-300";

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-md border-b-2 border-on-surface/10">
      <div className="max-w-container-max mx-auto flex items-center justify-between gap-3 px-margin-mobile py-2 md:px-margin-desktop">
        <Link
          className="font-headline-md text-on-surface transition-all duration-300 hover:opacity-80 flex shrink-0 items-center gap-2"
          href="/"
        >
          <Image src={Logo} alt="AWS Student Builder Group at SRMIST logo" className="h-8 w-8" />
          <span className="hidden md:block leading-tight">
            <span className="block text-sm font-bold tracking-wide">AWS SBG at SRMIST</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-primary">Recruitment</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 font-label-md text-xs uppercase tracking-wide sm:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.href)}
              aria-current={isLinkActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {account ? (
          <Link
            href={account.href}
            className="flex max-w-[120px] shrink-0 items-center gap-1.5 truncate border-2 border-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors duration-300 hover:bg-primary hover:text-on-primary sm:max-w-[180px] sm:px-4"
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{account.name}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="shrink-0 border-2 border-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors duration-300 hover:bg-primary hover:text-on-primary sm:px-4"
          >
            Apply
          </Link>
        )}
      </div>
    </nav>
  );
}

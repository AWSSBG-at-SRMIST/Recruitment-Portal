"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, User } from "lucide-react";
import Logo from "../../public/logo.png";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/domains", label: "Domains" },
];

export function Navbar({ account }: { account?: { name: string; href: string } | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isLinkActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    isLinkActive(href)
      ? "text-primary font-semibold border-b-2 border-primary transition-all duration-300 hover:-translate-y-0.5 inline-block"
      : "text-on-surface-variant hover:text-primary transition-all duration-300 hover:-translate-y-0.5 inline-block relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-primary hover:after:scale-x-100 after:transition-transform after:duration-300";

  const mobileLinkClass = (href: string) =>
    isLinkActive(href)
      ? "text-primary font-semibold block py-3"
      : "text-on-surface-variant hover:text-primary transition-colors duration-300 block py-3";

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-md border-b-2 border-on-surface/10">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-2 grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center">
        <Link
          className="font-headline-md text-on-surface transition-all duration-300 hover:opacity-80 flex justify-start items-center gap-2"
          href="/"
        >
          <Image src={Logo} alt="AWS Student Builder Group at SRMIST logo" className="h-8 w-8" />
          <span className="hidden md:block leading-tight">
            <span className="block text-sm font-bold tracking-wide">AWS SBG at SRMIST</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-primary">Recruitment</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center justify-center gap-6 font-label-md text-xs uppercase tracking-wide">
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

        <div className="flex justify-end items-center gap-3">
          {account ? (
            <Link
              href={account.href}
              className="hidden max-w-[180px] items-center gap-2 truncate text-xs uppercase tracking-wide font-bold px-4 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors duration-300 md:inline-flex"
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{account.name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-block text-xs uppercase tracking-wide font-bold px-4 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors duration-300"
            >
              Sign In
            </Link>
          )}
          <button
            aria-label="Toggle menu"
            onClick={() => setIsOpen((v) => !v)}
            className="md:hidden text-on-surface p-2.5"
          >
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden border-t-2 border-on-surface/10 bg-background/95 backdrop-blur-md transition-[max-height] duration-300 ease-in-out ${
          isOpen ? "max-h-64" : "max-h-0 border-t-0"
        }`}
      >
        <div className="flex flex-col px-margin-mobile py-2 gap-0 font-label-md text-sm uppercase tracking-wide">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={mobileLinkClass(link.href)}
            >
              {link.label}
            </Link>
          ))}
          {account ? (
            <Link
              href={account.href}
              onClick={() => setIsOpen(false)}
              className="truncate text-primary font-bold block py-3"
            >
              {account.name}
            </Link>
          ) : (
            <Link href="/login" onClick={() => setIsOpen(false)} className="text-primary font-bold block py-3">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

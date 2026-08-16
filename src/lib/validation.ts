import {
  ALL_DOMAINS,
  DOMAIN_SUBDOMAINS,
  YEAR_OPTIONS,
  DEPARTMENT_OPTIONS,
  GENDER_OPTIONS,
  type Domain,
  type Subdomain,
} from "@/types";

export function isValidDomain(v: unknown): v is Domain {
  return v === "Technical" || v === "Corporate" || v === "Creatives";
}

// Recruitment is 1st/2nd year CSE only — the apply UI only offers these via
// dropdown, but the client can be bypassed, so enforce it here too.
export function isValidYear(v: unknown): boolean {
  return typeof v === "string" && (YEAR_OPTIONS as readonly string[]).includes(v);
}

export function isValidDepartment(v: unknown): boolean {
  return typeof v === "string" && (DEPARTMENT_OPTIONS as readonly string[]).includes(v);
}

export function isValidGender(v: unknown): boolean {
  return typeof v === "string" && (GENDER_OPTIONS as readonly string[]).includes(v);
}

export function isValidSubdomain(domain: Domain, v: unknown): v is Subdomain {
  return typeof v === "string" && (DOMAIN_SUBDOMAINS[domain] as string[]).includes(v);
}

// Subdomain validity without already knowing the domain — for callers (like
// the chat route) that only receive the subdomain.
export function isRealSubdomain(v: unknown): v is Subdomain {
  return typeof v === "string" && ALL_DOMAINS.some((d) => isValidSubdomain(d, v));
}

export function isSrmEmail(email: string): boolean {
  return /^[^\s@]+@srmist\.edu\.in$/i.test(email.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// SRM registration number, e.g. RA2311003011411 (matches the club form's rule).
export function isValidRegNo(regNo: string): boolean {
  return /^RA\d{10,13}$/.test(regNo.trim().toUpperCase());
}

// 10-digit Indian mobile (matches the club form's rule).
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
}

export function isLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/.+/i.test(url.trim());
}

// Accept whatever an applicant pastes — bare handle, @handle, or a full
// profile URL — and reduce it to the plain username the APIs expect.
export function normalizeUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  // Strip a profile URL down to its last path segment (github.com/u/name → name).
  const urlMatch = s.match(/(?:github\.com|leetcode\.com)\/(?:u\/)?([^/?#\s]+)/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/^@/, "").replace(/\/+$/, "");
  return s || null;
}

// The browser-supplied Content-Type on a file upload is entirely client
// controlled — check the actual bytes too. Every real PDF starts with the
// "%PDF-" magic number.
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

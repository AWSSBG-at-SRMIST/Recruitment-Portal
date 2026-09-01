import { DOMAIN_SUBDOMAINS, type Application, type Domain, type SessionUser, type Subdomain } from "@/types";

export function isPresidium(user: SessionUser): boolean {
  return user.role === "SBG_LEADER" || user.role === "SECRETARY";
}

// Faculty/industry mentors — not club members, see every application
// read-only, can't change status or touch questions. Kept distinct from
// isPresidium() so it never accidentally picks up Presidium-only edit rights.
export function isObserver(user: SessionUser): boolean {
  return user.role === "OBSERVER";
}

// Everyone who lands in the admin dashboard instead of the applicant chat
// flow after login. Builders and non-members (role === null) are not admins
// — they go straight to /apply. Observers land here too (view-only, not
// actually "admin", but the dashboard is where their access lives).
const ADMIN_ROLES: ReadonlySet<string> = new Set([
  "SBG_LEADER",
  "SECRETARY",
  "DIRECTOR",
  "MANAGER",
  "ASSOCIATE",
  "OBSERVER",
]);

export function isAdmin(user: SessionUser): boolean {
  return !!user.role && ADMIN_ROLES.has(user.role);
}

// Presidium: every application, every domain.
// Observer: every application, every domain — same reach as Presidium, but
// see canChangeStatus/canEditSubdomainQuestions below for what they can't do.
// Director: every application within their own domain (all subdomains under it).
// Manager/Associate: only applications in their own subdomain.
export function canViewApplication(user: SessionUser, application: Application): boolean {
  if (isPresidium(user) || isObserver(user)) return true;
  if (user.role === "DIRECTOR") return application.domain === user.domain;
  if (user.role === "MANAGER" || user.role === "ASSOCIATE") return application.subdomain === user.subdomain;
  return false;
}

// Same scope as view — Director can shortlist/interview/select/reject across
// their whole domain, not just their own subdomain. Observer can view but
// never change status — they're read-only by design.
export function canChangeStatus(user: SessionUser, application: Application): boolean {
  if (isObserver(user)) return false;
  return canViewApplication(user, application);
}

// Presidium can edit any subdomain's questionnaire. A Manager can only edit
// their own subdomain's. A Director can edit any subdomain within their own
// domain (their view already spans the whole domain). Associates and
// Observers don't configure questions.
export function canEditSubdomainQuestions(user: SessionUser, subdomain: Subdomain): boolean {
  if (isPresidium(user)) return true;
  if (user.role === "MANAGER") return user.subdomain === subdomain;
  if (user.role === "DIRECTOR") return !!user.domain && DOMAIN_SUBDOMAINS[user.domain].includes(subdomain);
  return false;
}

// Interview evaluation is Manager/Associate territory (unlike application
// questions, which Associates don't touch) — a Director can still reach any
// subdomain in their own domain, and Presidium any subdomain at all.
export function canEditInterviewCriteria(user: SessionUser, subdomain: Subdomain): boolean {
  if (isPresidium(user)) return true;
  if (user.role === "MANAGER" || user.role === "ASSOCIATE") return user.subdomain === subdomain;
  if (user.role === "DIRECTOR") return !!user.domain && DOMAIN_SUBDOMAINS[user.domain].includes(subdomain);
  return false;
}

// Same scope as interview evaluation — Manager/Associate own-subdomain,
// Director own-domain, Presidium unrestricted.
export function canEditGDCriteria(user: SessionUser, subdomain: Subdomain): boolean {
  if (isPresidium(user)) return true;
  if (user.role === "MANAGER" || user.role === "ASSOCIATE") return user.subdomain === subdomain;
  if (user.role === "DIRECTOR") return !!user.domain && DOMAIN_SUBDOMAINS[user.domain].includes(subdomain);
  return false;
}

// Domain(s)/subdomain(s) a user's view should be scoped to, for building
// filter dropdowns and list-query scoping. `null` domain/subdomain in the
// result means "no restriction on this axis" (Presidium, Observer, or a
// Director's subdomain axis).
export function getVisibilityScope(user: SessionUser): { domain: Domain | null; subdomain: Subdomain | null } {
  if (isPresidium(user) || isObserver(user)) return { domain: null, subdomain: null };
  if (user.role === "DIRECTOR") return { domain: user.domain, subdomain: null };
  return { domain: user.domain, subdomain: user.subdomain };
}

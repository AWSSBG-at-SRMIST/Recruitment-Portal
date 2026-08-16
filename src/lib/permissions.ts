import { DOMAIN_SUBDOMAINS, type Application, type Domain, type SessionUser, type Subdomain } from "@/types";

export function isPresidium(user: SessionUser): boolean {
  return user.role === "SBG_LEADER" || user.role === "SECRETARY";
}

// Everyone who lands in the admin dashboard instead of the applicant chat
// flow after login. Builders and non-members (role === null) are not admins
// — they go straight to /apply.
const ADMIN_ROLES: ReadonlySet<string> = new Set(["SBG_LEADER", "SECRETARY", "DIRECTOR", "MANAGER", "ASSOCIATE"]);

export function isAdmin(user: SessionUser): boolean {
  return !!user.role && ADMIN_ROLES.has(user.role);
}

// Presidium: every application, every domain.
// Director: every application within their own domain (all subdomains under it).
// Manager/Associate: only applications in their own subdomain.
export function canViewApplication(user: SessionUser, application: Application): boolean {
  if (isPresidium(user)) return true;
  if (user.role === "DIRECTOR") return application.domain === user.domain;
  if (user.role === "MANAGER" || user.role === "ASSOCIATE") return application.subdomain === user.subdomain;
  return false;
}

// Same scope as view — Director can shortlist/interview/select/reject across
// their whole domain, not just their own subdomain.
export function canChangeStatus(user: SessionUser, application: Application): boolean {
  return canViewApplication(user, application);
}

// Presidium can edit any subdomain's questionnaire. A Manager can only edit
// their own subdomain's. A Director can edit any subdomain within their own
// domain (their view already spans the whole domain). Associates don't
// configure questions.
export function canEditSubdomainQuestions(user: SessionUser, subdomain: Subdomain): boolean {
  if (isPresidium(user)) return true;
  if (user.role === "MANAGER") return user.subdomain === subdomain;
  if (user.role === "DIRECTOR") return !!user.domain && DOMAIN_SUBDOMAINS[user.domain].includes(subdomain);
  return false;
}

// Domain(s)/subdomain(s) a user's view should be scoped to, for building
// filter dropdowns and list-query scoping. `null` domain/subdomain in the
// result means "no restriction on this axis" (Presidium, or a Director's
// subdomain axis).
export function getVisibilityScope(user: SessionUser): { domain: Domain | null; subdomain: Subdomain | null } {
  if (isPresidium(user)) return { domain: null, subdomain: null };
  if (user.role === "DIRECTOR") return { domain: user.domain, subdomain: null };
  return { domain: user.domain, subdomain: user.subdomain };
}

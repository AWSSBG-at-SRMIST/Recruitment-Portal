import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin, isPresidium, canEditInterviewCriteria } from "@/lib/permissions";
import { DOMAIN_SUBDOMAINS } from "@/types";
import { PortalSidebar } from "@/components/PortalSidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/dashboard";
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }
  // Logged in but not an admin role (Builder, or a plain applicant) — this
  // portal isn't for them, send them to the flow that is.
  if (!isAdmin(user)) redirect("/apply");

  // Presidium (any subdomain), Director (their own domain), and Manager
  // (their own subdomain) configure questions — Associates don't.
  const canSeeQuestionsNav = isPresidium(user) || user.role === "MANAGER" || user.role === "DIRECTOR";
  // Manager/Associate/Director/Presidium score interviews — Observers and
  // Builders don't get this nav item.
  const canSeeInterviewsNav = isPresidium(user) || Object.values(DOMAIN_SUBDOMAINS).flat().some((s) => canEditInterviewCriteria(user, s));

  return (
    <PortalSidebar user={user} canSeeQuestionsNav={canSeeQuestionsNav} canSeeInterviewsNav={canSeeInterviewsNav}>
      {children}
    </PortalSidebar>
  );
}

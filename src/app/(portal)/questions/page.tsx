import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { isPresidium, canEditSubdomainQuestions } from "@/lib/permissions";
import { DOMAIN_SUBDOMAINS, type Subdomain } from "@/types";
import { QuestionsEditor } from "@/components/QuestionsEditor";
import { getRecruitmentStatus } from "@/lib/recruitment-window";

export const metadata: Metadata = { title: "Questions" };
export const dynamic = "force-dynamic";

export default async function QuestionsSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Presidium can edit any subdomain's questions; a Director can edit any
  // subdomain within their own domain; a Manager only their own subdomain.
  // Associates don't configure questions — nothing to show them here.
  const editableSubdomains: Subdomain[] = isPresidium(user)
    ? Object.values(DOMAIN_SUBDOMAINS).flat()
    : Object.values(DOMAIN_SUBDOMAINS)
        .flat()
        .filter((s) => canEditSubdomainQuestions(user, s));

  if (editableSubdomains.length === 0) redirect("/dashboard");

  const initialSubdomain = editableSubdomains[0];
  const initialQuestions = await repo.getSubdomainQuestions(initialSubdomain);
  // Locked the moment recruitment opens — see api/questions/route.ts PUT for
  // the enforced version of this same check.
  const locked = getRecruitmentStatus() !== "before";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-on-surface">Application Questions</h1>
        <p className="mt-1 text-on-surface-variant">
          {isPresidium(user)
            ? "Edit the questionnaire any subdomain shows applicants."
            : user.role === "DIRECTOR"
              ? "Edit the questionnaire any subdomain in your domain shows applicants."
              : "Edit the questionnaire your subdomain shows applicants."}
        </p>
        {locked && (
          <p className="mt-3 border-2 border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            Recruitment has started — questions are locked for this cycle and can&apos;t be changed. They&apos;ll be
            editable again once the next cycle&apos;s window opens.
          </p>
        )}
      </div>

      <QuestionsEditor
        editableSubdomains={editableSubdomains}
        initialSubdomain={initialSubdomain}
        initialQuestions={initialQuestions}
        locked={locked}
      />
    </div>
  );
}

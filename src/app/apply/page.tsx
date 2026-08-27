import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ApplyChatClient } from "@/components/ApplyChatClient";
import { Button } from "@/components/ui/button";
import { CornerBrackets } from "@/components/ui/CornerBrackets";
import { getRecruitmentStatus, getRecruitmentWindow, formatIst } from "@/lib/recruitment-window";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/apply");
  // Admins live in the dashboard, not the applicant chat — bounce them there.
  if (isAdmin(user)) redirect("/dashboard");

  const status = getRecruitmentStatus();
  if (status !== "open") {
    const { opensAt, closesAt } = getRecruitmentWindow();
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="relative max-w-md border-2 border-on-surface/10 bg-surface-container-lowest p-10 text-center card-shadow">
          <CornerBrackets />
          {status === "before" ? (
            <Clock className="mx-auto mb-4 h-12 w-12 text-primary" />
          ) : (
            <Lock className="mx-auto mb-4 h-12 w-12 text-primary" />
          )}
          <h1 className="font-display mb-2 text-2xl font-bold text-on-surface">
            {status === "before" ? "Applications aren't open yet" : "Applications are closed"}
          </h1>
          <p className="mb-6 text-on-surface-variant">
            {status === "before"
              ? `This recruitment cycle opens ${formatIst(opensAt)} IST — come back then to apply.`
              : `This recruitment cycle closed ${formatIst(closesAt)} IST. Thanks for your interest — follow us for the next cycle.`}
          </p>
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // They already verified this email via OTP — shown read-only, never re-asked.
  // A real member's name (e.g. a Builder applying) is known too, so pre-fill it.
  return <ApplyChatClient collegeEmail={user.email} initialName={user.memberId ? user.name : undefined} />;
}

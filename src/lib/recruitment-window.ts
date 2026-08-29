// The recruitment cycle's open window — single source of truth for every
// place that needs to know whether applications are open (landing page
// copy, the /apply gate, and both the applications/chat API routes as
// defense in depth against someone hitting the API directly).
//
// Explicit +05:30 offsets so this is correct regardless of the server's own
// timezone (IST is what matters here — SRMIST, not the deploy region).
const OPENS_AT = process.env.RECRUITMENT_OPENS_AT || "2026-08-27T00:01:00+05:30";
const CLOSES_AT = process.env.RECRUITMENT_CLOSES_AT || "2026-08-30T23:59:00+05:30";

export type RecruitmentWindowStatus = "before" | "open" | "closed";

export function getRecruitmentWindow(): { opensAt: Date; closesAt: Date } {
  return { opensAt: new Date(OPENS_AT), closesAt: new Date(CLOSES_AT) };
}

export function getRecruitmentStatus(now: Date = new Date()): RecruitmentWindowStatus {
  const { opensAt, closesAt } = getRecruitmentWindow();
  if (now < opensAt) return "before";
  if (now > closesAt) return "closed";
  return "open";
}

export function isRecruitmentOpen(now: Date = new Date()): boolean {
  return getRecruitmentStatus(now) === "open";
}

// Fixed locale/timezone (not the server's default) so this renders the same
// no matter where the app is deployed — always IST, always en-IN formatting.
export function formatIst(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

import type { Subdomain } from "@/types";

// Fixed recruitment policy for this cycle — how many total builders each
// subdomain should end up with (including whoever's already in the club
// there). Change here, not per-page, if the numbers ever move.
export const RECRUITMENT_TARGETS: Record<Subdomain, number> = {
  "Software Development": 5,
  "AI & Machine Learning": 5,
  "Cloud & DevOps": 5,
  "Events & Operations": 9,
  "Sponsorship & Finance": 7,
  "HR & Admin": 7,
  "PR & Marketing": 9,
  "Digital Design": 5,
  "Media Production": 5,
};

// Shortlist (GD) 3x the open seats, Interview 2x, then pick the best `open`
// at the end.
export const GD_FUNNEL_MULTIPLIER = 3;
export const INTERVIEW_FUNNEL_MULTIPLIER = 2;

// Acceptable gender split for a subdomain's selections — 50/50 is the goal,
// 60/40 is the tolerated edge before it's flagged.
export const GENDER_RATIO_TOLERANCE = 0.6;

// SRM reg numbers encode admission year right after "RA" (e.g. RA25... =
// admitted 2025) — this cycle's applicants are only ever RA25/RA26 (see
// isValidRegNo), but sbg-members holds everyone already in the club,
// including years further back. A 2-digit calendar year, not a real
// "current academic year" lookup — good enough for "is this person a
// rising 3rd-year", not for anything that needs to be exact to the month.
export function yearOfStudy(regNo: string, now: Date = new Date()): number | null {
  const match = /^RA(\d{2})/.exec(regNo.trim().toUpperCase());
  if (!match) return null;
  const admissionYear = 2000 + Number(match[1]);
  return now.getFullYear() - admissionYear + 1;
}

// 3rd year (or beyond) builders are still full members with full
// privileges — they just don't count against this cycle's seat targets,
// since they're on their way out of the club, not staying for years to come.
export function isSeniorBuilder(regNo: string, now: Date = new Date()): boolean {
  const yos = yearOfStudy(regNo, now);
  return yos !== null && yos >= 3;
}

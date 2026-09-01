import type { Subdomain } from "@/types";

// Fixed recruitment policy for this cycle — how many seats each subdomain is
// recruiting for. Change here, not per-page, if the numbers ever move.
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

// Shortlist (GD) 3x the seats, Interview 2x, then pick the best `target` at
// the end.
export const GD_FUNNEL_MULTIPLIER = 3;
export const INTERVIEW_FUNNEL_MULTIPLIER = 2;

// Acceptable gender split for a subdomain's selections — 50/50 is the goal,
// 60/40 is the tolerated edge before it's flagged.
export const GENDER_RATIO_TOLERANCE = 0.6;

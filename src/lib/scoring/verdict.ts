import type { Domain, VerdictLabel } from "@/types";

export function scoreToVerdict(score: number): VerdictLabel {
  if (score >= 78) return "Strong Fit";
  if (score >= 62) return "Good Fit";
  if (score >= 45) return "Maybe";
  return "Weak Fit";
}

export function verdictColor(label: VerdictLabel): string {
  switch (label) {
    case "Strong Fit":
      return "text-emerald-400";
    case "Good Fit":
      return "text-brand-primary-light";
    case "Maybe":
      return "text-amber-400";
    case "Weak Fit":
      return "text-red-400";
  }
}

// Fixed competency axes per domain so the radar has consistent, meaningful
// labels. The LLM rates each 0-100 from the resume + questionnaire (+ verified
// signals for Technical). Axis sets are tuned to what each domain actually
// values.
export const DOMAIN_COMPETENCY_AXES: Record<Domain, string[]> = {
  Technical: [
    "Coding Ability",
    "Project Experience",
    "Problem Solving",
    "Tool Breadth",
    "Learning Velocity",
    "Communication",
  ],
  Corporate: [
    "Communication",
    "Relevant Experience",
    "Persuasion / Ops",
    "Initiative",
    "Professionalism",
    "Domain Knowledge",
  ],
  Creatives: [
    "Craft / Skill",
    "Portfolio Strength",
    "Creativity",
    "Tool Proficiency",
    "Communication",
    "Initiative",
  ],
};

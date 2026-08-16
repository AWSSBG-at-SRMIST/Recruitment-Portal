import type { Domain, Subdomain } from "@/types";

// What each subdomain's evaluator should weigh. Injected into the Groq prompt
// so the AI verdict is calibrated to what the domain actually needs, rather
// than one generic "is this a good candidate" pass.

export const SUBDOMAIN_RUBRICS: Record<Subdomain, string> = {
  "Software Development":
    "Weigh hands-on building ability: shipped projects, ownership, breadth/depth of stack, and (from verified GitHub signals) whether they actually push code. Penalise resume claims not backed by public activity.",
  "AI & Machine Learning":
    "Weigh real ML project experience (data → model → result), framework fluency (PyTorch/TF/sklearn), and problem-solving depth. Use verified GitHub/LeetCode signals to gauge coding ability. Reward candidates who understand tradeoffs, not just tool names.",
  "Cloud & DevOps":
    "Weigh hands-on infra exposure: cloud services, containers, CI/CD, Linux, automation. Reward practical deployment/ops experience over certifications alone. Cross-check any coding claims with GitHub signals.",
  "Events & Operations":
    "Weigh organisational ability, calm under pressure, and prior event/volunteer experience. The venue-cancellation answer reveals prioritisation and delegation — reward concrete, actionable plans over vague enthusiasm.",
  "Sponsorship & Finance":
    "Weigh persuasion and professionalism: is the outreach pitch clear, tailored, and confident? Does the negotiation answer show composure and value-framing? Reward business sense and communication over jargon.",
  "HR & Admin":
    "Weigh interpersonal maturity, fairness, and coordination ability. The conflict scenario reveals empathy and decisiveness — reward balanced, people-first approaches that still protect the deadline.",
  "PR & Marketing":
    "Weigh creativity, audience awareness, and copy quality. Judge the campaign pitch on hook, platform fit, and feasibility; judge the caption on punch. Reward original ideas over generic marketing-speak.",
  "Digital Design":
    "Weigh visual sensibility, design thinking, and tool fluency (Figma/Adobe). The project description should show intent behind choices, not just 'I made it look nice'. Portfolio link (if given) is strong evidence — note if missing.",
  "Media Production":
    "Weigh production/editing skill and storytelling. The project description should show craft (shooting, pacing, editing) and tool fluency (Premiere/DaVinci/After Effects). Portfolio link (if given) is strong evidence — note if missing.",
};

export function getRubric(_domain: Domain, subdomain: Subdomain): string {
  return SUBDOMAIN_RUBRICS[subdomain];
}

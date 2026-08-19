import type { Domain, Subdomain } from "@/types";

// What each subdomain's evaluator should weigh. Injected into the Groq prompt
// so the AI verdict is calibrated to what the domain actually needs, rather
// than one generic "is this a good candidate" pass.

export const SUBDOMAIN_RUBRICS: Record<Subdomain, string> = {
  "Software Development":
    "Weigh hands-on building ability from their project and skills answers — real ownership and a concrete stack, not tutorial-following. The domain-work answer should show genuine engagement with building, not just familiarity. Cross-check any coding claims with verified GitHub signals; penalise resume/GitHub mismatches. Internship proof, if given, is a strong signal.",
  "AI & Machine Learning":
    "Weigh real ML project experience (data → model → result) and framework fluency (PyTorch/TF/sklearn) from their project and skills answers. Use verified GitHub/LeetCode signals to gauge coding ability. Reward candidates who explain tradeoffs, not just tool names.",
  "Cloud & DevOps":
    "Weigh hands-on infra exposure — the domain-work answer should name specific AWS/cloud services, containers, CI/CD, or Linux work, not generic buzzwords. Reward practical deployment/ops experience and internship proof over certifications alone. Cross-check any coding claims with GitHub signals.",
  "Events & Operations":
    "Weigh organisational ability and calm-under-pressure signals in their experience answer — concrete event/volunteer roles beat vague enthusiasm. The contribution answer should read as a realistic, specific plan for this domain, not generic ambition.",
  "Sponsorship & Finance":
    "Weigh persuasion, professionalism, and business sense in how they describe their experience — look for real evidence of outreach, negotiation, or financial responsibility. Reward a clear, confident contribution answer over jargon.",
  "HR & Admin":
    "Weigh interpersonal maturity, fairness, and coordination ability in their experience answer — prior people-management, coordination, or admin roles matter more than titles. The contribution answer should show empathy balanced with follow-through.",
  "PR & Marketing":
    "Weigh creativity, audience awareness, and communication quality across their answers. Look for real evidence of content, campaign, or outreach work in their experience answer, and original thinking in how they'd contribute.",
  "Digital Design":
    "Weigh visual sensibility, design thinking, and tool fluency (Figma/Adobe) from their skillset and project answers — the project should show intent behind choices, not just 'I made it look nice'. Portfolio/work links are strong evidence — note if missing or thin.",
  "Media Production":
    "Weigh production/editing skill and storytelling from their skillset and project answers — look for craft (shooting, pacing, editing) and tool fluency (Premiere/DaVinci/After Effects). Portfolio/work links are strong evidence — note if missing or thin.",
};

export function getRubric(_domain: Domain, subdomain: Subdomain): string {
  return SUBDOMAIN_RUBRICS[subdomain];
}

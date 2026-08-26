import type { Domain, Subdomain } from "@/types";

// What each subdomain's evaluator should weigh. Injected into the Groq prompt
// so the AI verdict is calibrated to what the domain actually needs, rather
// than one generic "is this a good candidate" pass.

export const SUBDOMAIN_RUBRICS: Record<Subdomain, string> = {
  "Software Development":
    "Weigh hands-on building ability from their project and skills answers — real ownership and a concrete stack, not tutorial-following. The domain-work answer should show genuine engagement with building, not just familiarity. Cross-check any coding claims with verified GitHub signals; penalise resume/GitHub mismatches. Internship proof, if given, is a strong signal.",
  "AI & Machine Learning":
    "Weigh genuine conceptual understanding over memorised definitions — the supervised/unsupervised and accuracy-vs-class-imbalance answers should show real reasoning, not textbook phrasing. The basic-coding answer is a real signal of coding ability on its own; use verified GitHub/LeetCode signals to corroborate it. A self-driven project explored out of curiosity matters more than coursework alone.",
  "Cloud & DevOps":
    "Weigh how they'd actually architect for scale in the high-traffic scenario — look for real infra thinking (load balancing, auto-scaling, caching, CDN), not just buzzwords. The teamwork and continuous-learning answers should show genuine collaboration and self-driven learning, not generic claims. A GitHub/portfolio link, if given, is strong evidence — note if missing or thin.",
  "Events & Operations":
    "Weigh organisational ability and calm-under-pressure signals in their experience answer — concrete event/volunteer roles beat vague enthusiasm. The contribution answer should read as a realistic, specific plan for this domain, not generic ambition.",
  "Sponsorship & Finance":
    "Weigh persuasion, professionalism, and business sense in how they describe their experience — look for real evidence of outreach, negotiation, or financial responsibility. Reward a clear, confident contribution answer over jargon.",
  "HR & Admin":
    "Weigh interpersonal maturity, fairness, and coordination ability in their experience answer — prior people-management, coordination, or admin roles matter more than titles. The contribution answer should show empathy balanced with follow-through.",
  "PR & Marketing":
    "Weigh creativity, audience awareness, and writing craft directly from their answers. The marketing-approach and marketing-idea answers should propose a specific, original hook rather than generic advice ('post more', 'make a poster'). The persuasion answer is a pure writing-craft test — judge wit, structure, and confidence within the 3-sentence constraint. Reward original ideas over generic marketing-speak.",
  "Digital Design":
    "Weigh visual sensibility, design thinking, and tool fluency (Figma/Adobe) from their skillset and project answers — the project should show intent behind choices, not just 'I made it look nice'. Portfolio/work links are strong evidence — note if missing or thin.",
  "Media Production":
    "Weigh production/editing skill and storytelling from their skillset and project answers — look for craft (shooting, pacing, editing) and tool fluency (Premiere/DaVinci/After Effects). Portfolio/work links are strong evidence — note if missing or thin.",
};

export function getRubric(_domain: Domain, subdomain: Subdomain): string {
  return SUBDOMAIN_RUBRICS[subdomain];
}

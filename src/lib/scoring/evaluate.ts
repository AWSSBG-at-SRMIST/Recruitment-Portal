import type {
  AIEvaluation,
  Application,
  CompetencyScore,
  Domain,
  QuestionDef,
  Subdomain,
  VerifiedSignals,
} from "@/types";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import { parseResume } from "@/lib/resume-parser";
import { repo } from "@/lib/repo";
import { getRubric } from "./rubrics";
import { fetchGithubSignals, detectInflation, githubToSignals } from "./github";
import { fetchLeetcodeSignals } from "./leetcode";
import { scoreToVerdict, DOMAIN_COMPETENCY_AXES } from "./verdict";

export interface EvaluationInput {
  domain: Domain;
  subdomain: Subdomain;
  resumeBuffer: Buffer;
  questionnaire: Record<string, string>;
  portfolioUrl: string | null;
  githubUsername: string | null;
  leetcodeUsername: string | null;
  awsCertCount: number; // number of AWS certification links provided
}

export interface EvaluationResult {
  aiScore: number;
  aiEvaluation: AIEvaluation;
  verifiedSignals: VerifiedSignals | null;
}

// Gathers verified GitHub/LeetCode signals for Technical applicants. Uses the
// username the applicant typed, falling back to whatever the resume parser
// extracted from the PDF.
async function gatherTechnicalSignals(
  input: EvaluationInput,
  claimedSkills: string[],
  resumeGithub: string | null,
  resumeLeetcode: string | null
): Promise<VerifiedSignals | null> {
  if (input.domain !== "Technical") return null;

  const githubUsername = input.githubUsername || resumeGithub;
  const leetcodeUsername = input.leetcodeUsername || resumeLeetcode;
  if (!githubUsername && !leetcodeUsername) return null;

  const signals: VerifiedSignals = {};

  if (githubUsername) {
    const gh = await fetchGithubSignals(githubUsername);
    if (gh?.found) {
      const inflation = detectInflation(claimedSkills, gh.languages);
      Object.assign(signals, githubToSignals(gh, inflation));
    }
  }

  if (leetcodeUsername) {
    const lc = await fetchLeetcodeSignals(leetcodeUsername);
    if (lc?.found) {
      signals.leetcodeSolved = lc.solved;
      if (lc.ranking) signals.leetcodeRanking = lc.ranking;
    }
  }

  return Object.keys(signals).length ? signals : null;
}

function buildPrompt(
  input: EvaluationInput,
  resumeText: string,
  signals: VerifiedSignals | null,
  questionDefs: QuestionDef[]
): string {
  const rubric = getRubric(input.domain, input.subdomain);

  const qaBlock = questionDefs
    .map((q) => `Q: ${q.label}\nA: ${input.questionnaire[q.id]?.trim() || "(no answer)"}`)
    .join("\n\n");

  const signalBlock = signals
    ? `\n\nVERIFIED EXTERNAL SIGNALS (objective, cross-checked from public profiles):\n${JSON.stringify(signals, null, 2)}`
    : "";

  const portfolioBlock = input.portfolioUrl
    ? `\n\nPortfolio link provided: ${input.portfolioUrl}`
    : "\n\nNo portfolio link provided.";

  const certBlock =
    input.awsCertCount > 0
      ? `\n\nAWS Certifications: the candidate provided ${input.awsCertCount} AWS certification link(s) — a meaningful positive signal for a cloud/builder club.`
      : "\n\nAWS Certifications: none provided.";

  const axes = DOMAIN_COMPETENCY_AXES[input.domain];

  return `You are an experienced recruiter for AWS Student Builder Group (AWS SBG) at SRMIST, evaluating a candidate applying to the "${input.subdomain}" subdomain of the "${input.domain}" domain.

EVALUATION RUBRIC FOR THIS SUBDOMAIN:
${rubric}

RESUME (extracted text, may be noisy):
"""
${resumeText.slice(0, 6000)}
"""

QUESTIONNAIRE RESPONSES:
${qaBlock}${portfolioBlock}${certBlock}${signalBlock}

Score the candidate's fit for THIS subdomain from 0-100. Be honest and discriminating — most real candidates land 40-75; reserve 85+ for genuinely exceptional fit. Weigh the rubric heavily. If verified signals contradict resume claims, factor that in.

Also rate the candidate 0-100 on each of these competency axes for a radar chart: ${axes.join(", ")}.
Extract the key skills/tools/strengths the candidate demonstrably has (short lowercase tags).

Respond with ONLY a valid JSON object, no markdown, in exactly this shape:
{
  "score": <integer 0-100>,
  "verdictLabel": "Strong Fit" | "Good Fit" | "Maybe" | "Weak Fit",
  "executiveSummary": "<one crisp sentence overall assessment>",
  "strengths": ["<short phrase>", ...],
  "concerns": ["<short phrase>", ...],
  "recommendation": "<one or two sentence hiring recommendation>",
  "competencies": [${axes.map((a) => `{ "axis": "${a}", "score": <0-100> }`).join(", ")}],
  "detectedSkills": ["<tag>", ...]
}`;
}

// Coerce whatever the LLM returned into exactly the domain's axis set, so the
// radar always renders consistent labels even if the model drifts.
function normalizeCompetencies(
  domain: Domain,
  raw: CompetencyScore[] | undefined
): CompetencyScore[] {
  const axes = DOMAIN_COMPETENCY_AXES[domain];
  const byAxis = new Map((raw ?? []).map((c) => [c.axis?.toLowerCase(), Number(c.score) || 0]));
  return axes.map((axis) => ({
    axis,
    score: Math.max(0, Math.min(100, Math.round(byAxis.get(axis.toLowerCase()) ?? 0))),
  }));
}

// Builds a rough competency radar from heuristic signals when there's no LLM —
// every axis gets a defensible baseline so the demo radar isn't empty.
function heuristicCompetencies(
  domain: Domain,
  base: number,
  answeredDepth: number,
  signals: VerifiedSignals | null
): CompetencyScore[] {
  const axes = DOMAIN_COMPETENCY_AXES[domain];
  const communication = Math.min(100, 35 + answeredDepth * 12);
  const codingSignal = signals?.githubSubScores
    ? Math.round(
        (signals.githubSubScores.techBreadth +
          signals.githubSubScores.projectDepth +
          signals.githubSubScores.recency) /
          3
      )
    : base;
  return axes.map((axis) => {
    if (/communication/i.test(axis)) return { axis, score: communication };
    if (/coding|craft|tool|breadth/i.test(axis)) return { axis, score: codingSignal };
    return { axis, score: base };
  });
}

// Deterministic fallback used when GROQ_API_KEY is absent or the API fails —
// keeps the portal fully functional for the local demo. Mirrors Hiresense's
// "works without any LLM key" guarantee.
function heuristicEvaluation(
  input: EvaluationInput,
  resumeText: string,
  signals: VerifiedSignals | null,
  detectedSkills: string[]
): EvaluationResult {
  let score = 50;
  const strengths: string[] = [];
  const concerns: string[] = [];

  const answered = Object.values(input.questionnaire).filter((a) => a?.trim().length > 40).length;
  score += Math.min(answered * 4, 16);
  if (answered >= 3) strengths.push("Thorough, detailed questionnaire responses");
  else concerns.push("Sparse questionnaire answers");

  if (resumeText.trim().length > 500) {
    score += 6;
    strengths.push("Substantive resume content");
  } else {
    concerns.push("Resume text is thin or unreadable");
  }

  if (input.portfolioUrl) {
    score += 6;
    strengths.push("Portfolio link provided");
  }

  if (input.awsCertCount > 0) {
    score += Math.min(input.awsCertCount * 5, 10);
    strengths.push(`Holds ${input.awsCertCount} AWS certification${input.awsCertCount > 1 ? "s" : ""}`);
  }

  if (signals) {
    if (signals.githubPublicRepos && signals.githubPublicRepos > 3) {
      score += 8;
      strengths.push(`Active GitHub (${signals.githubPublicRepos} public repos)`);
    }
    if (signals.leetcodeSolved) {
      const total = signals.leetcodeSolved.easy + signals.leetcodeSolved.medium + signals.leetcodeSolved.hard;
      if (total > 50) {
        score += 6;
        strengths.push(`Solid LeetCode activity (${total} solved)`);
      }
    }
    if (signals.inflationFlag) {
      score -= 12;
      concerns.push(signals.inflationNote || "Possible resume inflation vs. GitHub activity");
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    aiScore: score,
    aiEvaluation: {
      score,
      verdictLabel: scoreToVerdict(score),
      executiveSummary: `Heuristic assessment: ${scoreToVerdict(score).toLowerCase()} for ${input.subdomain} based on questionnaire depth, resume, and verified signals.`,
      strengths: strengths.length ? strengths : ["Application submitted"],
      concerns: concerns.length ? concerns : ["No AI model configured — heuristic score only"],
      recommendation:
        "Heuristic score (no LLM key configured). Review manually before shortlisting.",
      competencies: heuristicCompetencies(input.domain, score, answered, signals),
      detectedSkills: detectedSkills.slice(0, 20),
    },
    verifiedSignals: signals,
  };
}

export async function evaluateApplication(input: EvaluationInput): Promise<EvaluationResult> {
  const parsed = await parseResume(input.resumeBuffer);
  const signals = await gatherTechnicalSignals(
    input,
    parsed.skills,
    parsed.githubUsername,
    parsed.leetcodeUsername
  );

  const groq = getGroq();
  if (!groq) {
    return heuristicEvaluation(input, parsed.rawText, signals, parsed.skills);
  }

  try {
    const questionDefs = await repo.getSubdomainQuestions(input.subdomain);
    const prompt = buildPrompt(input, parsed.rawText, signals, questionDefs);
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsedJson = JSON.parse(raw) as Partial<AIEvaluation>;

    const score = Math.max(0, Math.min(100, Math.round(Number(parsedJson.score) || 0)));
    const competencies = normalizeCompetencies(input.domain, parsedJson.competencies);

    return {
      aiScore: score,
      aiEvaluation: {
        score,
        verdictLabel: parsedJson.verdictLabel || scoreToVerdict(score),
        executiveSummary: parsedJson.executiveSummary || parsedJson.recommendation || "",
        strengths: Array.isArray(parsedJson.strengths) ? parsedJson.strengths : [],
        concerns: Array.isArray(parsedJson.concerns) ? parsedJson.concerns : [],
        recommendation: parsedJson.recommendation || "",
        competencies,
        detectedSkills: Array.isArray(parsedJson.detectedSkills)
          ? parsedJson.detectedSkills.slice(0, 20)
          : parsed.skills.slice(0, 20),
      },
      verifiedSignals: signals,
    };
  } catch (err) {
    console.error("Groq evaluation failed, falling back to heuristic:", err);
    return heuristicEvaluation(input, parsed.rawText, signals, parsed.skills);
  }
}

// Convenience wrapper for re-scoring an existing stored application.
export type StoredForEvaluation = Pick<
  Application,
  "domain" | "subdomain" | "questionnaire" | "portfolioUrl" | "githubUsername" | "leetcodeUsername"
>;

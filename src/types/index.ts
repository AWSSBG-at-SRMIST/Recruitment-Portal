export type Domain = "Technical" | "Corporate" | "Creatives";

export type TechSubdomain = "Software Development" | "AI & Machine Learning" | "Cloud & DevOps";
export type CorporateSubdomain = "Events & Operations" | "Sponsorship & Finance" | "HR & Admin" | "PR & Marketing";
export type CreativesSubdomain = "Digital Design" | "Media Production";
export type Subdomain = TechSubdomain | CorporateSubdomain | CreativesSubdomain;

export const DOMAIN_SUBDOMAINS: Record<Domain, Subdomain[]> = {
  Technical: ["Software Development", "AI & Machine Learning", "Cloud & DevOps"],
  Corporate: ["Events & Operations", "Sponsorship & Finance", "HR & Admin", "PR & Marketing"],
  Creatives: ["Digital Design", "Media Production"],
};

export const ALL_DOMAINS: Domain[] = ["Technical", "Corporate", "Creatives"];

export interface QuestionDef {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "link";
}

export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "SELECTED" | "REJECTED";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "REJECTED",
];

export interface AIEvaluation {
  score: number;
  verdictLabel: VerdictLabel;
  executiveSummary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  // 0-100 ratings across role-appropriate axes → competency radar.
  competencies: CompetencyScore[];
  // Key skills/tools the evaluator detected in the resume + answers.
  detectedSkills: string[];
}

export type VerdictLabel = "Strong Fit" | "Good Fit" | "Maybe" | "Weak Fit";

export interface CompetencyScore {
  axis: string;
  score: number;
}

export interface GithubSubScores {
  techBreadth: number; // 0-100, from distinct languages
  projectDepth: number; // 0-100, from public repo count
  recency: number; // 0-100, from days since last push
}

export interface VerifiedSignals {
  githubLanguages?: Record<string, number>;
  githubPublicRepos?: number;
  githubFollowers?: number;
  githubTotalStars?: number;
  githubLastActive?: string | null; // ISO date of most recent push
  githubSubScores?: GithubSubScores;
  leetcodeSolved?: { easy: number; medium: number; hard: number };
  leetcodeRanking?: number;
  inflationFlag?: boolean;
  inflationNote?: string;
}

// Recruitment is scoped to 1st/2nd year CSE only — enforced both in the
// apply UI (dropdown, not free text) and server-side on submit.
export const YEAR_OPTIONS = ["1st Year", "2nd Year"] as const;
export type Year = (typeof YEAR_OPTIONS)[number];

export const DEPARTMENT_OPTIONS = ["CSE C.Tech", "CSE CINTEL", "CSE DSBS", "CSE NWC"] as const;
export type Department = (typeof DEPARTMENT_OPTIONS)[number];

export const GENDER_OPTIONS = ["Male", "Female"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export interface Application {
  applicationId: string;
  name: string;
  regNo: string;
  gender: string; // one of GENDER_OPTIONS
  year: string;
  degree: string; // one of DEPARTMENT_OPTIONS
  phone: string;
  collegeEmail: string; // SRM email (@srmist.edu.in)
  personalEmail: string;
  dob: string | null; // optional
  domain: Domain;
  subdomain: Subdomain;
  // Optional for 1st years, mandatory for 2nd years — null means not submitted.
  resumeFileRef: string | null;
  portfolioUrl: string | null;
  linkedin: string;
  githubUsername: string | null;
  leetcodeUsername: string | null;
  awsCertLinks: string[]; // 0-3 optional AWS certification links (Credly/AWS)
  // Optional, self-reported "follow us" nudge — not scored. A username is
  // proof of the follow, so it's only present when the candidate actually
  // checked that box. LinkedIn has no meaningful per-candidate username for
  // a company-page follow, so it's just a checkbox.
  instagramUsername: string | null;
  meetupUsername: string | null;
  followedLinkedin: boolean;
  // Mandatory — the applicant must confirm before they can submit.
  joinedRecruitmentGroup: boolean;
  questionnaire: Record<string, string>;
  status: ApplicationStatus;
  aiScore: number | null;
  aiEvaluation: AIEvaluation | null;
  verifiedSignals: VerifiedSignals | null;
  appliedAt: number;
}

// Every role a club member can hold, plus OBSERVER — faculty/industry
// mentors who aren't club members at all (no sbg-members record) but get
// read-only visibility into every application. Admin-dashboard access (vs.
// the plain applicant chat flow) is decided in lib/permissions.ts, not here.
export type MemberRole = "SBG_LEADER" | "SECRETARY" | "DIRECTOR" | "MANAGER" | "ASSOCIATE" | "BUILDER" | "OBSERVER";

// One unified login for the whole app. `role`/`memberId` are null for
// someone who isn't a club member at all — a prospective applicant who just
// verified their @srmist.edu.in email via OTP.
export interface SessionUser {
  memberId: string | null;
  name: string;
  email: string;
  role: MemberRole | null;
  domain: Domain | null;
  subdomain: Subdomain | null;
}

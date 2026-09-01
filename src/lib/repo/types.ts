import type {
  Application,
  ApplicationStatus,
  Domain,
  QuestionDef,
  Subdomain,
  SessionUser,
  AIEvaluation,
  VerifiedSignals,
  Year,
  InterviewCriterion,
  InterviewCriterionScore,
  InterviewScore,
  GDCriterion,
  GDCriterionScore,
  GDScore,
} from "@/types";

export interface NewApplication {
  applicationId: string;
  name: string;
  regNo: string;
  gender: string;
  year: string;
  degree: string;
  phone: string;
  collegeEmail: string;
  personalEmail: string;
  dob: string | null;
  domain: Domain;
  subdomain: Subdomain;
  resumeFileRef: string | null;
  portfolioUrl: string | null;
  linkedin: string;
  githubUsername: string | null;
  leetcodeUsername: string | null;
  awsCertLinks: string[];
  instagramUsername: string | null;
  meetupUsername: string | null;
  followedLinkedin: boolean;
  joinedRecruitmentGroup: boolean;
  questionnaire: Record<string, string>;
  appliedAt: number;
}

export interface ApplicationFilter {
  domain?: Domain;
  subdomain?: Subdomain;
  status?: ApplicationStatus;
  year?: Year;
}

export type OTPVerifyResult = "valid" | "invalid" | "expired" | "locked";

export interface Repo {
  createApplication(app: NewApplication): Promise<Application>;
  getApplication(applicationId: string): Promise<Application | null>;
  getApplicationByEmail(collegeEmail: string): Promise<Application | null>;
  // Atomically reserves an email for one application — a plain "scan then
  // write" duplicate check has a race window under concurrent submissions
  // (two requests from the same email can both pass the check before either
  // write lands). Returns false if the email is already claimed. Call
  // releaseApplicationEmail if the submission fails after claiming, so a
  // genuine failure doesn't permanently lock the applicant out.
  claimApplicationEmail(collegeEmail: string): Promise<boolean>;
  releaseApplicationEmail(collegeEmail: string): Promise<void>;
  listApplications(filter?: ApplicationFilter): Promise<Application[]>;
  updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void>;
  updateApplicationEvaluation(
    applicationId: string,
    result: { aiScore: number; aiEvaluation: AIEvaluation; verifiedSignals: VerifiedSignals | null }
  ): Promise<void>;
  deleteApplication(applicationId: string, resumeFileRef: string | null): Promise<void>;

  // Recruiter/session identity is real member data (see @/lib/members) — the
  // Repo layer only owns OTP/session/rate-limit storage, not who's allowed
  // to log in.
  storeOTP(email: string, otpHash: string, ttlSeconds: number): Promise<void>;
  checkOTPResendCooldown(email: string, cooldownSeconds: number): Promise<boolean>;
  getOTPRecord(email: string): Promise<{ otpHash: string; expiresAt: number; attempts: number } | null>;
  incrementOTPAttempts(email: string, maxAttempts: number): Promise<"ok" | "locked">;
  deleteOTP(email: string): Promise<void>;

  createSession(token: string, user: SessionUser, ttlSeconds: number): Promise<void>;
  getSession(token: string): Promise<SessionUser | null>;
  deleteSession(token: string): Promise<void>;

  checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;

  saveResumeFile(applicationId: string, buffer: Buffer): Promise<string>;
  getResumeFile(fileRef: string): Promise<Buffer | null>;

  // No code-level fallback — questions live only in DynamoDB, set via the
  // /questions page. Returns [] if unconfigured.
  getSubdomainQuestions(subdomain: Subdomain): Promise<QuestionDef[]>;
  setSubdomainQuestions(subdomain: Subdomain, questions: QuestionDef[], updatedBy: string): Promise<void>;

  // Interview evaluation criteria, configured once per subdomain (not shown
  // to applicants — separate from getSubdomainQuestions). Returns [] if
  // unconfigured.
  getInterviewCriteria(subdomain: Subdomain): Promise<InterviewCriterion[]>;
  setInterviewCriteria(subdomain: Subdomain, criteria: InterviewCriterion[], updatedBy: string): Promise<void>;

  // One row per application, rating each of the subdomain's current criteria
  // 1-10. Returns null if nobody has scored this application yet.
  getInterviewScore(applicationId: string): Promise<InterviewScore | null>;
  saveInterviewScore(applicationId: string, scores: InterviewCriterionScore[], updatedBy: string): Promise<InterviewScore>;
  // Every scored application at once, for the interview evaluation board —
  // avoids one round trip per candidate.
  getAllInterviewScores(): Promise<InterviewScore[]>;

  // Group Discussion evaluation criteria, configured once per subdomain —
  // same shape as the interview criteria above, but a separate table since
  // GD (SHORTLISTED stage) and Interview are scored independently.
  getGDCriteria(subdomain: Subdomain): Promise<GDCriterion[]>;
  setGDCriteria(subdomain: Subdomain, criteria: GDCriterion[], updatedBy: string): Promise<void>;

  getGDScore(applicationId: string): Promise<GDScore | null>;
  saveGDScore(applicationId: string, scores: GDCriterionScore[], updatedBy: string): Promise<GDScore>;
  getAllGDScores(): Promise<GDScore[]>;
}

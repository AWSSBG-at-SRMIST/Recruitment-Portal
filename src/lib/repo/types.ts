import type {
  Application,
  ApplicationStatus,
  Domain,
  QuestionDef,
  Subdomain,
  SessionUser,
  AIEvaluation,
  VerifiedSignals,
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
  resumeFileRef: string;
  portfolioUrl: string | null;
  linkedin: string;
  githubUsername: string | null;
  leetcodeUsername: string | null;
  awsCertLinks: string[];
  questionnaire: Record<string, string>;
  appliedAt: number;
}

export interface ApplicationFilter {
  domain?: Domain;
  subdomain?: Subdomain;
  status?: ApplicationStatus;
}

export type OTPVerifyResult = "valid" | "invalid" | "expired" | "locked";

export interface Repo {
  createApplication(app: NewApplication): Promise<Application>;
  getApplication(applicationId: string): Promise<Application | null>;
  getApplicationByEmail(collegeEmail: string): Promise<Application | null>;
  listApplications(filter?: ApplicationFilter): Promise<Application[]>;
  updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void>;
  updateApplicationEvaluation(
    applicationId: string,
    result: { aiScore: number; aiEvaluation: AIEvaluation; verifiedSignals: VerifiedSignals | null }
  ): Promise<void>;

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

  // Falls back to DEFAULT_SUBDOMAIN_QUESTIONS (scoring/questions.ts) when a
  // subdomain hasn't been customized yet.
  getSubdomainQuestions(subdomain: Subdomain): Promise<QuestionDef[]>;
  setSubdomainQuestions(subdomain: Subdomain, questions: QuestionDef[], updatedBy: string): Promise<void>;
}

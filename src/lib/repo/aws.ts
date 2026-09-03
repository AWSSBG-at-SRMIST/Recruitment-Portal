import { createHash } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type {
  Application,
  InterviewCriterion,
  InterviewCriterionScore,
  InterviewScore,
  GDCriterion,
  GDCriterionScore,
  GDScore,
  QuestionDef,
  Subdomain,
} from "@/types";
import type { NewApplication, ApplicationFilter, Repo } from "./types";

// Same AWS account/region as Internal-Dashboard and Official-Website.
// Recruiter identity itself is NOT stored here — that's the real
// sbg-members table, read via @/lib/members.

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" });
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
// S3 buckets don't move with the account's default region — this bucket was
// created in us-east-1, not ap-south-1, so it needs its own region setting
// rather than reusing AWS_REGION (which is correct for DynamoDB). Using the
// wrong region here is a hard failure (PermanentRedirect), not a slow one.
const s3 = new S3Client({ region: process.env.S3_REGION || "us-east-1" });
const S3_BUCKET = process.env.S3_BUCKET || "sbg-recruitment-resumes";

const TABLE = {
  APPLICATIONS: "sbg-recruitment-applications",
  APPLICATION_EMAILS: "sbg-recruitment-application-emails",
  QUESTIONS: "sbg-recruitment-questions",
  INTERVIEW_CRITERIA: "sbg-recruitment-interview-criteria",
  INTERVIEW_SCORES: "sbg-recruitment-interview-scores",
  GD_CRITERIA: "sbg-recruitment-gd-criteria",
  GD_SCORES: "sbg-recruitment-gd-scores",
  OTPS: "sbg-recruitment-otps",
  SESSIONS: "sbg-recruitment-sessions",
  RATE_LIMITS: "sbg-recruitment-rate-limits",
} as const;

function streamToBuffer(stream: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const s = stream as NodeJS.ReadableStream;
    s.on("data", (chunk: Buffer) => chunks.push(chunk));
    s.on("end", () => resolve(Buffer.concat(chunks)));
    s.on("error", reject);
  });
}

// A single ScanCommand caps its response at ~1MB of evaluated data — once a
// table's total scanned size exceeds that (as sbg-recruitment-applications
// eventually did, once each item carries a full AI evaluation), DynamoDB
// returns a partial page plus a LastEvaluatedKey and silently truncates
// unless the caller loops. Every full-table read in this file must go
// through this helper, not a bare ScanCommand.
async function scanAll<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await db.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey: exclusiveStartKey })
    );
    items.push(...((result.Items as T[]) ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

export const awsRepo: Repo = {
  async createApplication(app: NewApplication): Promise<Application> {
    const item = { ...app, status: "APPLIED", aiScore: null, aiEvaluation: null, verifiedSignals: null };
    await db.send(new PutCommand({ TableName: TABLE.APPLICATIONS, Item: item }));
    return item as Application;
  },

  async getApplication(applicationId) {
    const result = await db.send(new GetCommand({ TableName: TABLE.APPLICATIONS, Key: { applicationId } }));
    return (result.Item as Application) ?? null;
  },

  async getApplicationByEmail(collegeEmail) {
    // A Scan's Limit caps items evaluated per page, not items matching the
    // filter — combined with FilterExpression, Limit:1 could scan exactly
    // one (non-matching) item and wrongly report "no application" even when
    // one exists elsewhere in the table. Scan everything, filter in memory.
    const items = await scanAll<Application>(TABLE.APPLICATIONS);
    return items.find((a) => a.collegeEmail === collegeEmail) ?? null;
  },

  async claimApplicationEmail(collegeEmail) {
    try {
      await db.send(
        new PutCommand({
          TableName: TABLE.APPLICATION_EMAILS,
          Item: { collegeEmail, claimedAt: Math.floor(Date.now() / 1000) },
          ConditionExpression: "attribute_not_exists(collegeEmail)",
        })
      );
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "ConditionalCheckFailedException") return false;
      throw err;
    }
  },

  async releaseApplicationEmail(collegeEmail) {
    await db.send(new DeleteCommand({ TableName: TABLE.APPLICATION_EMAILS, Key: { collegeEmail } }));
  },

  async listApplications(filter: ApplicationFilter = {}) {
    let items = await scanAll<Application>(TABLE.APPLICATIONS);
    if (filter.domain) items = items.filter((i) => i.domain === filter.domain);
    if (filter.subdomain) items = items.filter((i) => i.subdomain === filter.subdomain);
    if (filter.status) items = items.filter((i) => i.status === filter.status);
    if (filter.year) items = items.filter((i) => i.year === filter.year);
    return items.sort((a, b) => b.appliedAt - a.appliedAt);
  },

  async updateApplicationStatus(applicationId, status) {
    await db.send(
      new UpdateCommand({
        TableName: TABLE.APPLICATIONS,
        Key: { applicationId },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": status },
      })
    );
  },

  async updateApplicationEvaluation(applicationId, result) {
    await db.send(
      new UpdateCommand({
        TableName: TABLE.APPLICATIONS,
        Key: { applicationId },
        UpdateExpression: "SET aiScore = :score, aiEvaluation = :eval, verifiedSignals = :signals",
        ExpressionAttributeValues: {
          ":score": result.aiScore,
          ":eval": result.aiEvaluation,
          ":signals": result.verifiedSignals,
        },
      })
    );
  },

  async deleteApplication(applicationId, resumeFileRef) {
    await db.send(new DeleteCommand({ TableName: TABLE.APPLICATIONS, Key: { applicationId } }));
    if (!resumeFileRef) return;
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: resumeFileRef }));
    } catch (err) {
      console.error("Failed to delete resume file from S3 (application record already deleted):", err);
    }
  },

  async storeOTP(email, otpHash, ttlSeconds) {
    const now = Math.floor(Date.now() / 1000);
    await db.send(
      new PutCommand({
        TableName: TABLE.OTPS,
        Item: { email, otpHash, expiresAt: now + ttlSeconds, sentAt: now, attempts: 0 },
      })
    );
  },

  async checkOTPResendCooldown(email, cooldownSeconds) {
    const result = await db.send(new GetCommand({ TableName: TABLE.OTPS, Key: { email } }));
    if (!result.Item) return false;
    const now = Math.floor(Date.now() / 1000);
    return now - (result.Item.sentAt || 0) < cooldownSeconds;
  },

  async getOTPRecord(email) {
    const result = await db.send(new GetCommand({ TableName: TABLE.OTPS, Key: { email } }));
    if (!result.Item) return null;
    return { otpHash: result.Item.otpHash, expiresAt: result.Item.expiresAt, attempts: result.Item.attempts || 0 };
  },

  async incrementOTPAttempts(email, maxAttempts) {
    try {
      await db.send(
        new UpdateCommand({
          TableName: TABLE.OTPS,
          Key: { email },
          UpdateExpression: "SET attempts = if_not_exists(attempts, :zero) + :one",
          ConditionExpression: "attribute_not_exists(attempts) OR attempts < :max",
          ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":max": maxAttempts },
        })
      );
      return "ok";
    } catch (err) {
      if (err instanceof Error && err.name === "ConditionalCheckFailedException") return "locked";
      throw err;
    }
  },

  async deleteOTP(email) {
    await db.send(new DeleteCommand({ TableName: TABLE.OTPS, Key: { email } }));
  },

  async createSession(token, user, ttlSeconds) {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    await db.send(new PutCommand({ TableName: TABLE.SESSIONS, Item: { sessionToken: token, ...user, expiresAt } }));
  },

  async getSession(token) {
    const result = await db.send(new GetCommand({ TableName: TABLE.SESSIONS, Key: { sessionToken: token } }));
    if (!result.Item) return null;
    if (result.Item.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return {
      memberId: result.Item.memberId,
      name: result.Item.name,
      email: result.Item.email,
      role: result.Item.role,
      domain: result.Item.domain ?? null,
      subdomain: result.Item.subdomain ?? null,
    };
  },

  async deleteSession(token) {
    await db.send(new DeleteCommand({ TableName: TABLE.SESSIONS, Key: { sessionToken: token } }));
  },

  async checkRateLimit(key, limit, windowSeconds) {
    const now = Math.floor(Date.now() / 1000);
    const hashedKey = createHash("sha256").update(key).digest("hex");
    const result = await db.send(new GetCommand({ TableName: TABLE.RATE_LIMITS, Key: { key: hashedKey } }));
    const item = result.Item as { count: number; windowStart: number } | undefined;

    if (!item || now - item.windowStart >= windowSeconds) {
      await db.send(
        new PutCommand({ TableName: TABLE.RATE_LIMITS, Item: { key: hashedKey, count: 1, windowStart: now } })
      );
      return true;
    }
    if (item.count >= limit) return false;
    await db.send(
      new UpdateCommand({
        TableName: TABLE.RATE_LIMITS,
        Key: { key: hashedKey },
        UpdateExpression: "SET #c = #c + :one",
        ExpressionAttributeNames: { "#c": "count" },
        ExpressionAttributeValues: { ":one": 1 },
      })
    );
    return true;
  },

  async saveResumeFile(applicationId, buffer) {
    const key = `resumes/${applicationId}.pdf`;
    await s3.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: "application/pdf" })
    );
    return key;
  },

  async getResumeFile(fileRef) {
    try {
      const result = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileRef }));
      return await streamToBuffer(result.Body);
    } catch {
      return null;
    }
  },

  async getSubdomainQuestions(subdomain: Subdomain): Promise<QuestionDef[]> {
    const result = await db.send(new GetCommand({ TableName: TABLE.QUESTIONS, Key: { subdomain } }));
    return (result.Item?.questions as QuestionDef[]) ?? [];
  },

  async setSubdomainQuestions(subdomain, questions, updatedBy) {
    await db.send(
      new PutCommand({
        TableName: TABLE.QUESTIONS,
        Item: { subdomain, questions, updatedBy, updatedAt: Math.floor(Date.now() / 1000) },
      })
    );
  },

  async getInterviewCriteria(subdomain: Subdomain): Promise<InterviewCriterion[]> {
    const result = await db.send(new GetCommand({ TableName: TABLE.INTERVIEW_CRITERIA, Key: { subdomain } }));
    return (result.Item?.criteria as InterviewCriterion[]) ?? [];
  },

  async setInterviewCriteria(subdomain, criteria, updatedBy) {
    await db.send(
      new PutCommand({
        TableName: TABLE.INTERVIEW_CRITERIA,
        Item: { subdomain, criteria, updatedBy, updatedAt: Math.floor(Date.now() / 1000) },
      })
    );
  },

  async getInterviewScore(applicationId: string): Promise<InterviewScore | null> {
    const result = await db.send(new GetCommand({ TableName: TABLE.INTERVIEW_SCORES, Key: { applicationId } }));
    if (!result.Item) return null;
    return {
      applicationId,
      scores: (result.Item.scores as InterviewCriterionScore[]) ?? [],
      attended: (result.Item.attended as boolean) ?? false,
      updatedBy: result.Item.updatedBy ?? "",
      updatedAt: result.Item.updatedAt ?? 0,
    };
  },

  // UpdateCommand, not PutCommand — a full-item Put here would silently wipe
  // out `attended` (set independently via setInterviewAttendance) whenever
  // scores are saved afterward.
  async saveInterviewScore(applicationId, scores, updatedBy) {
    const updatedAt = Math.floor(Date.now() / 1000);
    const result = await db.send(
      new UpdateCommand({
        TableName: TABLE.INTERVIEW_SCORES,
        Key: { applicationId },
        UpdateExpression: "SET scores = :sc, updatedBy = :u, updatedAt = :t",
        ExpressionAttributeValues: { ":sc": scores, ":u": updatedBy, ":t": updatedAt },
        ReturnValues: "ALL_NEW",
      })
    );
    return {
      applicationId,
      scores,
      attended: (result.Attributes?.attended as boolean) ?? false,
      updatedBy,
      updatedAt,
    };
  },

  async setInterviewAttendance(applicationId, attended, updatedBy) {
    const updatedAt = Math.floor(Date.now() / 1000);
    const result = await db.send(
      new UpdateCommand({
        TableName: TABLE.INTERVIEW_SCORES,
        Key: { applicationId },
        UpdateExpression: "SET attended = :a, updatedBy = :u, updatedAt = :t",
        ExpressionAttributeValues: { ":a": attended, ":u": updatedBy, ":t": updatedAt },
        ReturnValues: "ALL_NEW",
      })
    );
    return {
      applicationId,
      scores: (result.Attributes?.scores as InterviewCriterionScore[]) ?? [],
      attended,
      updatedBy,
      updatedAt,
    };
  },

  async getAllInterviewScores(): Promise<InterviewScore[]> {
    const items = await scanAll<Record<string, unknown>>(TABLE.INTERVIEW_SCORES);
    return items.map((item) => ({
      applicationId: item.applicationId as string,
      scores: (item.scores as InterviewCriterionScore[]) ?? [],
      attended: (item.attended as boolean) ?? false,
      updatedBy: (item.updatedBy as string) ?? "",
      updatedAt: (item.updatedAt as number) ?? 0,
    }));
  },

  async getGDCriteria(subdomain: Subdomain): Promise<GDCriterion[]> {
    const result = await db.send(new GetCommand({ TableName: TABLE.GD_CRITERIA, Key: { subdomain } }));
    return (result.Item?.criteria as GDCriterion[]) ?? [];
  },

  async setGDCriteria(subdomain, criteria, updatedBy) {
    await db.send(
      new PutCommand({
        TableName: TABLE.GD_CRITERIA,
        Item: { subdomain, criteria, updatedBy, updatedAt: Math.floor(Date.now() / 1000) },
      })
    );
  },

  async getGDScore(applicationId: string): Promise<GDScore | null> {
    const result = await db.send(new GetCommand({ TableName: TABLE.GD_SCORES, Key: { applicationId } }));
    if (!result.Item) return null;
    return {
      applicationId,
      scores: (result.Item.scores as GDCriterionScore[]) ?? [],
      attended: (result.Item.attended as boolean) ?? false,
      updatedBy: result.Item.updatedBy ?? "",
      updatedAt: result.Item.updatedAt ?? 0,
    };
  },

  // UpdateCommand, not PutCommand — see saveInterviewScore for why: a full
  // Put would wipe out `attended` whenever scores are saved afterward.
  async saveGDScore(applicationId, scores, updatedBy) {
    const updatedAt = Math.floor(Date.now() / 1000);
    const result = await db.send(
      new UpdateCommand({
        TableName: TABLE.GD_SCORES,
        Key: { applicationId },
        UpdateExpression: "SET scores = :sc, updatedBy = :u, updatedAt = :t",
        ExpressionAttributeValues: { ":sc": scores, ":u": updatedBy, ":t": updatedAt },
        ReturnValues: "ALL_NEW",
      })
    );
    return {
      applicationId,
      scores,
      attended: (result.Attributes?.attended as boolean) ?? false,
      updatedBy,
      updatedAt,
    };
  },

  async setGDAttendance(applicationId, attended, updatedBy) {
    const updatedAt = Math.floor(Date.now() / 1000);
    const result = await db.send(
      new UpdateCommand({
        TableName: TABLE.GD_SCORES,
        Key: { applicationId },
        UpdateExpression: "SET attended = :a, updatedBy = :u, updatedAt = :t",
        ExpressionAttributeValues: { ":a": attended, ":u": updatedBy, ":t": updatedAt },
        ReturnValues: "ALL_NEW",
      })
    );
    return {
      applicationId,
      scores: (result.Attributes?.scores as GDCriterionScore[]) ?? [],
      attended,
      updatedBy,
      updatedAt,
    };
  },

  async getAllGDScores(): Promise<GDScore[]> {
    const items = await scanAll<Record<string, unknown>>(TABLE.GD_SCORES);
    return items.map((item) => ({
      applicationId: item.applicationId as string,
      scores: (item.scores as GDCriterionScore[]) ?? [],
      attended: (item.attended as boolean) ?? false,
      updatedBy: (item.updatedBy as string) ?? "",
      updatedAt: (item.updatedAt as number) ?? 0,
    }));
  },
};

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
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Application, QuestionDef, Subdomain } from "@/types";
import { DEFAULT_SUBDOMAIN_QUESTIONS } from "@/lib/scoring/questions";
import type { NewApplication, ApplicationFilter, Repo } from "./types";

// Same AWS account/region as Internal-Dashboard and Official-Website — see
// lib/repo/index.ts for the STORAGE_BACKEND switch. Recruiter identity
// itself is NOT stored here — that's the real sbg-members table, read via
// @/lib/members.

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
  QUESTIONS: "sbg-recruitment-questions",
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
    const result = await db.send(
      new ScanCommand({
        TableName: TABLE.APPLICATIONS,
        FilterExpression: "collegeEmail = :email",
        ExpressionAttributeValues: { ":email": collegeEmail },
        Limit: 1,
      })
    );
    return ((result.Items as Application[]) ?? [])[0] ?? null;
  },

  async listApplications(filter: ApplicationFilter = {}) {
    const result = await db.send(new ScanCommand({ TableName: TABLE.APPLICATIONS }));
    let items = (result.Items as Application[]) ?? [];
    if (filter.domain) items = items.filter((i) => i.domain === filter.domain);
    if (filter.subdomain) items = items.filter((i) => i.subdomain === filter.subdomain);
    if (filter.status) items = items.filter((i) => i.status === filter.status);
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
    return (result.Item?.questions as QuestionDef[]) ?? DEFAULT_SUBDOMAIN_QUESTIONS[subdomain];
  },

  async setSubdomainQuestions(subdomain, questions, updatedBy) {
    await db.send(
      new PutCommand({
        TableName: TABLE.QUESTIONS,
        Item: { subdomain, questions, updatedBy, updatedAt: Math.floor(Date.now() / 1000) },
      })
    );
  },
};

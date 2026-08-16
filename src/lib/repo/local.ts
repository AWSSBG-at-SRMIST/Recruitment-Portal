import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import type { Application, MemberRole, QuestionDef, Subdomain } from "@/types";
import { DEFAULT_SUBDOMAIN_QUESTIONS } from "@/lib/scoring/questions";
import type { NewApplication, ApplicationFilter, Repo } from "./types";

const DB_PATH = path.join(process.cwd(), "portal.db");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Survive Next.js dev-server hot reload without reopening the file each time.
const globalForDb = globalThis as unknown as { __portalDb?: DatabaseSync };

function getDb(): DatabaseSync {
  if (globalForDb.__portalDb) return globalForDb.__portalDb;

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      applicationId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      regNo TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL,
      degree TEXT NOT NULL,
      phone TEXT NOT NULL,
      collegeEmail TEXT NOT NULL,
      personalEmail TEXT NOT NULL DEFAULT '',
      dob TEXT,
      domain TEXT NOT NULL,
      subdomain TEXT NOT NULL,
      resumeFileRef TEXT NOT NULL,
      portfolioUrl TEXT,
      linkedin TEXT NOT NULL DEFAULT '',
      githubUsername TEXT,
      leetcodeUsername TEXT,
      awsCertLinks TEXT NOT NULL DEFAULT '[]',
      questionnaire TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'APPLIED',
      aiScore REAL,
      aiEvaluation TEXT,
      verifiedSignals TEXT,
      appliedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otps (
      email TEXT PRIMARY KEY,
      otpHash TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      sentAt INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sessionToken TEXT PRIMARY KEY,
      memberId TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT,
      domain TEXT,
      subdomain TEXT,
      expiresAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      windowStart INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subdomain_questions (
      subdomain TEXT PRIMARY KEY,
      questions TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  // Additive migration for DBs created before the club-form fields were added.
  // SQLite can't rename branch→degree in-place cleanly, so we add the new
  // columns and backfill degree from the legacy branch column if present.
  const cols = new Set(
    (db.prepare(`PRAGMA table_info(applications)`).all() as { name: string }[]).map((c) => c.name)
  );
  const addCol = (name: string, def: string) => {
    if (!cols.has(name)) db.exec(`ALTER TABLE applications ADD COLUMN ${name} ${def}`);
  };
  const degreeExisted = cols.has("degree");
  addCol("degree", "TEXT NOT NULL DEFAULT ''");
  addCol("personalEmail", "TEXT NOT NULL DEFAULT ''");
  addCol("dob", "TEXT");
  addCol("linkedin", "TEXT NOT NULL DEFAULT ''");
  addCol("awsCertLinks", "TEXT NOT NULL DEFAULT '[]'");
  addCol("gender", "TEXT NOT NULL DEFAULT ''");
  // Backfill degree from the legacy branch column, then drop it — otherwise its
  // NOT NULL constraint rejects new inserts that no longer supply `branch`.
  if (cols.has("branch")) {
    if (!degreeExisted) db.exec(`UPDATE applications SET degree = branch WHERE degree = ''`);
    db.exec(`ALTER TABLE applications DROP COLUMN branch`);
  }

  globalForDb.__portalDb = db;
  return db;
}

// Raw SQLite row shapes. Enum-typed columns (domain/subdomain/status) are
// stored as plain TEXT and cast back to their union types on read — the values
// only ever get written through the typed createApplication path.
interface ApplicationRow {
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
  domain: Application["domain"];
  subdomain: Application["subdomain"];
  resumeFileRef: string;
  portfolioUrl: string | null;
  linkedin: string;
  githubUsername: string | null;
  leetcodeUsername: string | null;
  awsCertLinks: string;
  questionnaire: string;
  status: Application["status"];
  aiScore: number | null;
  aiEvaluation: string | null;
  verifiedSignals: string | null;
  appliedAt: number;
}

function rowToApplication(row: ApplicationRow): Application {
  return {
    applicationId: row.applicationId,
    name: row.name,
    regNo: row.regNo,
    gender: row.gender,
    year: row.year,
    degree: row.degree,
    phone: row.phone,
    collegeEmail: row.collegeEmail,
    personalEmail: row.personalEmail,
    dob: row.dob,
    domain: row.domain,
    subdomain: row.subdomain,
    resumeFileRef: row.resumeFileRef,
    portfolioUrl: row.portfolioUrl,
    linkedin: row.linkedin,
    githubUsername: row.githubUsername,
    leetcodeUsername: row.leetcodeUsername,
    awsCertLinks: row.awsCertLinks ? JSON.parse(row.awsCertLinks) : [],
    questionnaire: JSON.parse(row.questionnaire),
    status: row.status,
    aiScore: row.aiScore,
    aiEvaluation: row.aiEvaluation ? JSON.parse(row.aiEvaluation) : null,
    verifiedSignals: row.verifiedSignals ? JSON.parse(row.verifiedSignals) : null,
    appliedAt: row.appliedAt,
  };
}

export const localRepo: Repo = {
  async createApplication(app: NewApplication): Promise<Application> {
    const db = getDb();
    db.prepare(
      `INSERT INTO applications
        (applicationId, name, regNo, gender, year, degree, phone, collegeEmail, personalEmail, dob, domain, subdomain,
         resumeFileRef, portfolioUrl, linkedin, githubUsername, leetcodeUsername, awsCertLinks, questionnaire, status, appliedAt)
       VALUES (@applicationId, @name, @regNo, @gender, @year, @degree, @phone, @collegeEmail, @personalEmail, @dob, @domain, @subdomain,
         @resumeFileRef, @portfolioUrl, @linkedin, @githubUsername, @leetcodeUsername, @awsCertLinks, @questionnaire, 'APPLIED', @appliedAt)`
    ).run({
      ...app,
      awsCertLinks: JSON.stringify(app.awsCertLinks),
      questionnaire: JSON.stringify(app.questionnaire),
    });
    return (await localRepo.getApplication(app.applicationId))!;
  },

  async getApplication(applicationId: string): Promise<Application | null> {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM applications WHERE applicationId = ?`).get(applicationId) as
      | ApplicationRow
      | undefined;
    return row ? rowToApplication(row) : null;
  },

  async getApplicationByEmail(collegeEmail: string): Promise<Application | null> {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM applications WHERE collegeEmail = ? LIMIT 1`).get(collegeEmail) as
      | ApplicationRow
      | undefined;
    return row ? rowToApplication(row) : null;
  },

  async listApplications(filter: ApplicationFilter = {}): Promise<Application[]> {
    const db = getDb();
    const clauses: string[] = [];
    const params: Record<string, string> = {};
    if (filter.domain) {
      clauses.push("domain = @domain");
      params.domain = filter.domain;
    }
    if (filter.subdomain) {
      clauses.push("subdomain = @subdomain");
      params.subdomain = filter.subdomain;
    }
    if (filter.status) {
      clauses.push("status = @status");
      params.status = filter.status;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db.prepare(`SELECT * FROM applications ${where} ORDER BY appliedAt DESC`).all(params) as unknown as ApplicationRow[];
    return rows.map(rowToApplication);
  },

  async updateApplicationStatus(applicationId, status): Promise<void> {
    const db = getDb();
    db.prepare(`UPDATE applications SET status = ? WHERE applicationId = ?`).run(status, applicationId);
  },

  async updateApplicationEvaluation(applicationId, result): Promise<void> {
    const db = getDb();
    db.prepare(
      `UPDATE applications SET aiScore = ?, aiEvaluation = ?, verifiedSignals = ? WHERE applicationId = ?`
    ).run(
      result.aiScore,
      JSON.stringify(result.aiEvaluation),
      result.verifiedSignals ? JSON.stringify(result.verifiedSignals) : null,
      applicationId
    );
  },

  async storeOTP(email, otpHash, ttlSeconds): Promise<void> {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      `INSERT INTO otps (email, otpHash, expiresAt, sentAt, attempts) VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(email) DO UPDATE SET otpHash = excluded.otpHash, expiresAt = excluded.expiresAt, sentAt = excluded.sentAt, attempts = 0`
    ).run(email, otpHash, now + ttlSeconds, now);
  },

  async checkOTPResendCooldown(email, cooldownSeconds): Promise<boolean> {
    const db = getDb();
    const row = db.prepare(`SELECT sentAt FROM otps WHERE email = ?`).get(email) as { sentAt: number } | undefined;
    if (!row) return false;
    const now = Math.floor(Date.now() / 1000);
    return now - row.sentAt < cooldownSeconds;
  },

  async getOTPRecord(email) {
    const db = getDb();
    const row = db.prepare(`SELECT otpHash, expiresAt, attempts FROM otps WHERE email = ?`).get(email) as
      | { otpHash: string; expiresAt: number; attempts: number }
      | undefined;
    return row ?? null;
  },

  async incrementOTPAttempts(email, maxAttempts) {
    const db = getDb();
    // SQLite is single-writer, so this read-then-write is effectively atomic
    // under better-sqlite3's synchronous execution model (no interleaving).
    const row = db.prepare(`SELECT attempts FROM otps WHERE email = ?`).get(email) as { attempts: number } | undefined;
    if (!row) return "locked";
    if (row.attempts >= maxAttempts) return "locked";
    db.prepare(`UPDATE otps SET attempts = attempts + 1 WHERE email = ?`).run(email);
    return "ok";
  },

  async deleteOTP(email): Promise<void> {
    const db = getDb();
    db.prepare(`DELETE FROM otps WHERE email = ?`).run(email);
  },

  async createSession(token, user, ttlSeconds): Promise<void> {
    const db = getDb();
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    db.prepare(
      `INSERT INTO sessions (sessionToken, memberId, name, email, role, domain, subdomain, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(token, user.memberId, user.name, user.email, user.role, user.domain, user.subdomain, expiresAt);
  },

  async getSession(token) {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM sessions WHERE sessionToken = ?`).get(token) as
      | { memberId: string | null; name: string; email: string; role: MemberRole | null; domain: string | null; subdomain: string | null; expiresAt: number }
      | undefined;
    if (!row) return null;
    if (row.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return {
      memberId: row.memberId,
      name: row.name,
      email: row.email,
      role: row.role,
      domain: row.domain as Application["domain"] | null,
      subdomain: row.subdomain as Application["subdomain"] | null,
    };
  },

  async deleteSession(token): Promise<void> {
    const db = getDb();
    db.prepare(`DELETE FROM sessions WHERE sessionToken = ?`).run(token);
  },

  async checkRateLimit(key, limit, windowSeconds): Promise<boolean> {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const row = db.prepare(`SELECT count, windowStart FROM rate_limits WHERE key = ?`).get(key) as
      | { count: number; windowStart: number }
      | undefined;

    if (!row || now - row.windowStart >= windowSeconds) {
      db.prepare(
        `INSERT INTO rate_limits (key, count, windowStart) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET count = 1, windowStart = excluded.windowStart`
      ).run(key, now);
      return true;
    }
    if (row.count >= limit) return false;
    db.prepare(`UPDATE rate_limits SET count = count + 1 WHERE key = ?`).run(key);
    return true;
  },

  async saveResumeFile(applicationId, buffer): Promise<string> {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const fileRef = `${applicationId}.pdf`;
    fs.writeFileSync(path.join(UPLOADS_DIR, fileRef), buffer);
    return fileRef;
  },

  async getResumeFile(fileRef): Promise<Buffer | null> {
    const filePath = path.join(UPLOADS_DIR, fileRef);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  },

  async getSubdomainQuestions(subdomain: Subdomain): Promise<QuestionDef[]> {
    const db = getDb();
    const row = db.prepare(`SELECT questions FROM subdomain_questions WHERE subdomain = ?`).get(subdomain) as
      | { questions: string }
      | undefined;
    return row ? JSON.parse(row.questions) : DEFAULT_SUBDOMAIN_QUESTIONS[subdomain];
  },

  async setSubdomainQuestions(subdomain, questions, updatedBy): Promise<void> {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      `INSERT INTO subdomain_questions (subdomain, questions, updatedBy, updatedAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(subdomain) DO UPDATE SET questions = excluded.questions, updatedBy = excluded.updatedBy, updatedAt = excluded.updatedAt`
    ).run(subdomain, JSON.stringify(questions), updatedBy, now);
  },
};

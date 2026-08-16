import { cookies } from "next/headers";
import { createHash } from "crypto";
import { repo } from "./repo";
import type { SessionUser } from "@/types";

const SESSION_TTL = 7 * 24 * 60 * 60;
const OTP_TTL = 5 * 60;
const OTP_RESEND_COOLDOWN = 60;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_COOKIE = "sbg_recruitment_session";

function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function randomToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function storeOTP(email: string, otp: string): Promise<void> {
  await repo.storeOTP(email, hashOTP(otp), OTP_TTL);
}

export async function checkOTPResendCooldown(email: string): Promise<boolean> {
  return repo.checkOTPResendCooldown(email, OTP_RESEND_COOLDOWN);
}

export async function verifyOTP(email: string, otp: string): Promise<"valid" | "invalid" | "expired" | "locked"> {
  const record = await repo.getOTPRecord(email);
  if (!record) return "invalid";
  const now = Math.floor(Date.now() / 1000);
  if (record.expiresAt < now) return "expired";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "locked";

  const incrementResult = await repo.incrementOTPAttempts(email, OTP_MAX_ATTEMPTS);
  if (incrementResult === "locked") return "locked";

  if (record.otpHash !== hashOTP(otp)) return "invalid";
  return "valid";
}

export async function deleteOTP(email: string): Promise<void> {
  await repo.deleteOTP(email);
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = randomToken();
  await repo.createSession(token, user, SESSION_TTL);
  return token;
}

export async function getSession(token: string): Promise<SessionUser | null> {
  return repo.getSession(token);
}

export async function deleteSession(token: string): Promise<void> {
  await repo.deleteSession(token);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSession(token);
}

export function setSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL,
    path: "/",
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

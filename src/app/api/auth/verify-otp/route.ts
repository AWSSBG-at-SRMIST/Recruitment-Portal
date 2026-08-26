import { NextRequest, NextResponse } from "next/server";
import { getMemberByEmail, getObserverByEmail } from "@/lib/members";
import { isAdmin } from "@/lib/permissions";
import { verifyOTP, deleteOTP, createSession, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { SessionUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    // Same shared-campus-IP reasoning as send-otp — high ceiling, still caps
    // sustained brute-force attempts (OTP itself is short-lived and locks
    // after 5 wrong tries per email regardless of this limit).
    if (!(await checkRateLimit(`verify-otp:${getClientIp(req)}`, 60, 10 * 60))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await verifyOTP(normalizedEmail, otp.trim());
    if (result === "locked") {
      return NextResponse.json({ error: "Too many failed attempts. Request a new OTP." }, { status: 429 });
    }
    if (result === "expired") {
      return NextResponse.json({ error: "OTP has expired. Request a new one." }, { status: 401 });
    }
    if (result === "invalid") {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    // One login for everyone: a real club member (any role) gets their
    // member record; a faculty/industry mentor on the observer allowlist
    // gets read-only access; anyone else who just verified an
    // @srmist.edu.in email is a plain applicant session with no role.
    const member = await getMemberByEmail(normalizedEmail);
    const sessionUser: SessionUser = member ?? (await getObserverByEmail(normalizedEmail)) ?? {
      memberId: null,
      name: normalizedEmail.split("@")[0],
      email: normalizedEmail,
      role: null,
      domain: null,
      subdomain: null,
    };

    // Create session before deleting OTP — if createSession fails the user
    // can retry with the same OTP rather than being permanently locked out.
    const token = await createSession(sessionUser);
    await deleteOTP(normalizedEmail);
    const cookieOpts = setSessionCookie(token);

    const response = NextResponse.json({ success: true, user: sessionUser, isAdmin: isAdmin(sessionUser) });
    response.cookies.set(cookieOpts);
    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}

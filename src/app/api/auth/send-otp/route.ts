import { NextRequest, NextResponse } from "next/server";
import { getMemberByEmail, getObserverByEmail } from "@/lib/members";
import { storeOTP, checkOTPResendCooldown } from "@/lib/auth";
import { sendOTPEmail } from "@/lib/email";
import { generateOTP } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ALLOWED_DOMAIN = "@srmist.edu.in";

function genericResponse() {
  return NextResponse.json({ success: true, message: "If this email is valid, an OTP has been sent." });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Rate-limited per IP, not per email — a real per-email cooldown already
    // exists below (checkOTPResendCooldown). Campus WiFi puts many students
    // behind one shared public IP, so this ceiling has to be high enough that
    // a busy recruitment window doesn't collectively lock out legitimate
    // users sharing that IP; it only needs to catch sustained abuse.
    if (!(await checkRateLimit(`send-otp:${getClientIp(req)}`, 60, 10 * 60))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // One login for everyone — any real SRM email can request an OTP,
    // member or not. Same generic response either way so this can't be used
    // to enumerate who's an existing club member.
    if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) return genericResponse();

    if (await checkOTPResendCooldown(normalizedEmail)) return genericResponse();

    const member = await getMemberByEmail(normalizedEmail);
    const greetingName = member?.name ?? (await getObserverByEmail(normalizedEmail))?.name;

    const otp = generateOTP();
    await storeOTP(normalizedEmail, otp);
    await sendOTPEmail(normalizedEmail, otp, greetingName);

    return genericResponse();
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

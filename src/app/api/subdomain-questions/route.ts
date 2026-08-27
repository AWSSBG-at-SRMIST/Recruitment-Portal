import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { isRealSubdomain } from "@/lib/validation";

// Plain fetch of a subdomain's questions for the apply form — any signed-in
// applicant, not just recruiters (unlike /api/questions, which is the
// Manager-editing endpoint gated by canEditSubdomainQuestions).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subdomain = new URL(req.url).searchParams.get("subdomain") || "";
  if (!isRealSubdomain(subdomain)) return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });

  const questions = await repo.getSubdomainQuestions(subdomain);
  return NextResponse.json({ questions });
}

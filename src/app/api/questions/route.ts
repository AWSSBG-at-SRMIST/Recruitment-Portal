import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canEditSubdomainQuestions } from "@/lib/permissions";
import { isRealSubdomain } from "@/lib/validation";
import type { QuestionDef } from "@/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subdomain = new URL(req.url).searchParams.get("subdomain") || "";
  if (!isRealSubdomain(subdomain)) return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  if (!canEditSubdomainQuestions(user, subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questions = await repo.getSubdomainQuestions(subdomain);
  return NextResponse.json({ questions });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const subdomain = body.subdomain;
  if (typeof subdomain !== "string" || !isRealSubdomain(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  }
  if (!canEditSubdomainQuestions(user, subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawQuestions = body.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
  }
  if (rawQuestions.length > 10) {
    return NextResponse.json({ error: "No more than 10 questions per subdomain" }, { status: 400 });
  }

  const seenIds = new Set<string>();
  const questions: QuestionDef[] = [];
  for (const q of rawQuestions) {
    const id = typeof q.id === "string" ? q.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") : "";
    const label = typeof q.label === "string" ? q.label.trim() : "";
    const placeholder = typeof q.placeholder === "string" ? q.placeholder.trim() : undefined;
    const type = q.type === "textarea" ? "textarea" : q.type === "link" ? "link" : "text";
    if (!id || !label) {
      return NextResponse.json({ error: "Every question needs an id and a label" }, { status: 400 });
    }
    if (seenIds.has(id)) {
      return NextResponse.json({ error: `Duplicate question id: ${id}` }, { status: 400 });
    }
    seenIds.add(id);
    questions.push({ id, label, ...(placeholder ? { placeholder } : {}), type });
  }

  await repo.setSubdomainQuestions(subdomain, questions, user.memberId ?? user.email);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canEditInterviewCriteria, canViewApplication } from "@/lib/permissions";
import type { InterviewCriterionScore } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await repo.getApplication(id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewApplication(user, application)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const score = await repo.getInterviewScore(id);
  return NextResponse.json({ score });
}

function isValidScores(value: unknown): value is InterviewCriterionScore[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (s) =>
      s &&
      typeof s.criterionId === "string" &&
      s.criterionId.trim().length > 0 &&
      Number.isInteger(s.score) &&
      s.score >= 1 &&
      s.score <= 10
  );
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await repo.getApplication(id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditInterviewCriteria(user, application.subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { scores } = await req.json();
  if (!isValidScores(scores)) {
    return NextResponse.json({ error: "Each rating needs a valid criterion and a score from 1 to 10." }, { status: 400 });
  }

  // Only ever score against criteria that currently exist for this
  // application's subdomain — drop anything stale (e.g. a criterion that
  // was since renamed/removed) rather than silently keeping dead ids.
  const currentCriteria = await repo.getInterviewCriteria(application.subdomain);
  const validIds = new Set(currentCriteria.map((c) => c.id));
  const cleanScores = scores.filter((s) => validIds.has(s.criterionId));

  const saved = await repo.saveInterviewScore(id, cleanScores, user.name);
  return NextResponse.json({ score: saved });
}

import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canEditGDCriteria } from "@/lib/permissions";
import { isRealSubdomain } from "@/lib/validation";
import type { GDCriterion } from "@/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subdomain = new URL(req.url).searchParams.get("subdomain") || "";
  if (!isRealSubdomain(subdomain)) return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  if (!canEditGDCriteria(user, subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const criteria = await repo.getGDCriteria(subdomain);
  return NextResponse.json({ criteria });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const subdomain = body.subdomain;
  if (typeof subdomain !== "string" || !isRealSubdomain(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  }
  if (!canEditGDCriteria(user, subdomain)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = body.criteria;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "At least one criterion is required" }, { status: 400 });
  }
  if (raw.length > 15) {
    return NextResponse.json({ error: "No more than 15 criteria per subdomain" }, { status: 400 });
  }

  const seenIds = new Set<string>();
  const criteria: GDCriterion[] = [];
  for (const c of raw) {
    const id = typeof c.id === "string" ? c.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") : "";
    const label = typeof c.label === "string" ? c.label.trim() : "";
    if (!id || !label) {
      return NextResponse.json({ error: "Every criterion needs a label" }, { status: 400 });
    }
    if (seenIds.has(id)) {
      return NextResponse.json({ error: `Duplicate criterion: ${label}` }, { status: 400 });
    }
    seenIds.add(id);
    criteria.push({ id, label });
  }

  await repo.setGDCriteria(subdomain, criteria, user.memberId ?? user.email);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canChangeStatus, canViewApplication } from "@/lib/permissions";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await repo.getApplication(id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewApplication(user, application)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();
  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const application = await repo.getApplication(id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canChangeStatus(user, application)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Shortlisting is closed for this cycle — nobody, including Presidium, can
  // move a new candidate into SHORTLISTED. Already-shortlisted candidates
  // can still move forward (Interview/Selected/Rejected) as normal.
  if (status === "SHORTLISTED" && application.status !== "SHORTLISTED") {
    return NextResponse.json({ error: "Shortlisting is closed — no new candidates can be added." }, { status: 403 });
  }

  await repo.updateApplicationStatus(id, status as ApplicationStatus);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await repo.getApplication(id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Same scope as changing status — Observer is read-only and cannot delete.
  if (!canChangeStatus(user, application)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await repo.deleteApplication(id, application.resumeFileRef);
  return NextResponse.json({ success: true });
}

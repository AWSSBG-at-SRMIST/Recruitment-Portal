import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { canViewApplication } from "@/lib/permissions";

// Streams a candidate's resume PDF — recruiter-only, and only for a
// recruiter with visibility into this application's domain/subdomain. The
// file lives on local disk now (or S3 once STORAGE_BACKEND=aws); either way
// it's fetched through the repo layer so it's never publicly addressable.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await repo.getApplication(id);
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewApplication(user, application)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await repo.getResumeFile(application.resumeFileRef);
  if (!file) return NextResponse.json({ error: "Resume file missing" }, { status: 404 });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${application.name.replace(/[^a-z0-9]/gi, "_")}_resume.pdf"`,
    },
  });
}

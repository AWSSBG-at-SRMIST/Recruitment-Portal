import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { repo } from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { evaluateApplication } from "@/lib/scoring/evaluate";
import {
  isValidDomain,
  isValidSubdomain,
  isSrmEmail,
  isValidEmail,
  isValidRegNo,
  isValidPhone,
  isLinkedInUrl,
  isGithubUrl,
  isValidYear,
  isValidDepartment,
  isValidGender,
  isPdfBuffer,
  sanitizeUrl,
  normalizeUsername,
} from "@/lib/validation";
import { getVisibilityScope } from "@/lib/permissions";
import { isRecruitmentOpen } from "@/lib/recruitment-window";
import type { ApplicationFilter } from "@/lib/repo";
import type { Domain, Subdomain, ApplicationStatus } from "@/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Requires login: submit an application ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "You must be signed in to apply." }, { status: 401 });

    // The apply page already gates on this — this is defense in depth
    // against someone hitting the API directly outside the window.
    if (!isRecruitmentOpen()) {
      return NextResponse.json({ error: "Applications are not currently open." }, { status: 403 });
    }

    // Same shared-campus-IP reasoning as the auth routes — many students
    // submitting near the deadline from the same WiFi shouldn't collide.
    if (!(await checkRateLimit(`apply:${getClientIp(req)}`, 30, 10 * 60))) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }

    const form = await req.formData();
    const get = (k: string) => (form.get(k) as string | null)?.trim() || "";

    const name = get("name");
    const regNo = get("regNo").toUpperCase();
    const gender = get("gender");
    const year = get("year");
    const degree = get("degree");
    const phone = get("phone");
    // The OTP-verified session email is the source of truth, not whatever
    // Nova's conversation happened to extract — prevents submitting under a
    // different identity than the one that logged in.
    const collegeEmail = user.email;
    const personalEmail = get("personalEmail").toLowerCase();
    const dob = get("dob") || null;
    const domain = get("domain");
    const subdomain = get("subdomain");
    const portfolioUrl = sanitizeUrl(get("portfolioUrl"));
    const linkedin = sanitizeUrl(get("linkedin")) || "";
    const githubLink = sanitizeUrl(get("githubUsername")) || "";
    const githubUsername = normalizeUsername(githubLink);
    const leetcodeUsername = normalizeUsername(get("leetcodeUsername"));

    // AWS certification links — optional, 0-3, each a valid URL.
    const awsCertLinks = [get("awsCertLink1"), get("awsCertLink2"), get("awsCertLink3")]
      .map((l) => sanitizeUrl(l))
      .filter((l): l is string => !!l)
      .slice(0, 3);

    // Self-reported, optional "follow us" nudge — not part of scoring. Each
    // checkbox is independent; a username is only required if its own
    // checkbox is checked (it's the proof of the follow).
    const stripHandle = (v: string) => v.replace(/^@/, "") || null;
    const instagramChecked = get("instagramFollowed") === "true";
    const instagramUsername = instagramChecked ? stripHandle(get("instagramUsername")) : null;
    const meetupChecked = get("meetupFollowed") === "true";
    const meetupUsername = meetupChecked ? stripHandle(get("meetupUsername")) : null;
    const followedLinkedin = get("followedLinkedin") === "true";

    if (instagramChecked && !instagramUsername) {
      return NextResponse.json({ error: "Enter your Instagram username, or uncheck that box." }, { status: 400 });
    }
    if (meetupChecked && !meetupUsername) {
      return NextResponse.json({ error: "Enter your Meetup username, or uncheck that box." }, { status: 400 });
    }

    // Mandatory — cannot submit without confirming this.
    const joinedRecruitmentGroup = get("joinedRecruitmentGroup") === "true";
    if (!joinedRecruitmentGroup) {
      return NextResponse.json({ error: "You must join the Recruitments WhatsApp group to submit." }, { status: 400 });
    }

    if (!name || !regNo || !gender || !year || !degree || !phone || !collegeEmail || !personalEmail) {
      return NextResponse.json({ error: "All required identity fields must be filled." }, { status: 400 });
    }
    if (!isSrmEmail(collegeEmail)) {
      return NextResponse.json({ error: "A valid @srmist.edu.in email is required." }, { status: 400 });
    }
    if (!isValidEmail(personalEmail)) {
      return NextResponse.json({ error: "A valid personal email is required." }, { status: 400 });
    }
    if (!isValidRegNo(regNo)) {
      return NextResponse.json(
        { error: "Registration number must be a valid RA25... or RA26... number (2025/2026 batch only)." },
        { status: 400 }
      );
    }
    if (!isValidGender(gender)) {
      return NextResponse.json({ error: "Invalid gender." }, { status: 400 });
    }
    // Recruitment is scoped to 1st/2nd year CSE only — the apply UI only
    // offers these via dropdown, but a direct API call could send anything.
    if (!isValidYear(year)) {
      return NextResponse.json({ error: "Year must be 1st Year or 2nd Year." }, { status: 400 });
    }
    if (!isValidDepartment(degree)) {
      return NextResponse.json({ error: "Invalid department." }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }
    if (!linkedin || !isLinkedInUrl(linkedin)) {
      return NextResponse.json({ error: "A valid LinkedIn profile URL is required." }, { status: 400 });
    }
    if (!isValidDomain(domain)) {
      return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
    }
    if (!isValidSubdomain(domain as Domain, subdomain)) {
      return NextResponse.json({ error: "Invalid subdomain for the chosen domain." }, { status: 400 });
    }
    // GitHub is mandatory for every domain — a real github.com link, not a bare username.
    if (!githubLink || !isGithubUrl(githubLink) || !githubUsername) {
      return NextResponse.json({ error: "A valid GitHub profile link is required." }, { status: 400 });
    }

    // Resume is optional for 1st years, mandatory for 2nd years.
    const resumeField = form.get("resume");
    const resumeProvided = resumeField instanceof File && resumeField.size > 0;
    if (year === "2nd Year" && !resumeProvided) {
      return NextResponse.json({ error: "A resume PDF is required for 2nd years." }, { status: 400 });
    }

    let buffer: Buffer | null = null;
    if (resumeProvided) {
      const resume = resumeField as File;
      if (resume.type !== "application/pdf") {
        return NextResponse.json({ error: "Resume must be a PDF." }, { status: 400 });
      }
      if (resume.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Resume exceeds the 10 MB limit." }, { status: 400 });
      }
      buffer = Buffer.from(await resume.arrayBuffer());
      // The browser-supplied Content-Type above is client controlled — a
      // renamed non-PDF would sail through that check alone.
      if (!isPdfBuffer(buffer)) {
        return NextResponse.json({ error: "That file isn't a valid PDF." }, { status: 400 });
      }
    }

    // One application per email — resubmitting isn't supported yet, so fail
    // clearly instead of silently creating a second entry.
    const existing = await repo.getApplicationByEmail(collegeEmail);
    if (existing) {
      return NextResponse.json(
        { error: "You've already submitted an application with this email." },
        { status: 409 }
      );
    }

    // Collect questionnaire answers for this subdomain's current question
    // set (Manager-editable — always read live, never cached at build time).
    const questionnaire: Record<string, string> = {};
    const subdomainQuestions = await repo.getSubdomainQuestions(subdomain as Subdomain);
    for (const q of subdomainQuestions) {
      questionnaire[q.id] = (form.get(`q_${q.id}`) as string | null)?.trim() || "";
    }

    const applicationId = nanoid(12);
    const resumeFileRef = buffer ? await repo.saveResumeFile(applicationId, buffer) : null;

    await repo.createApplication({
      applicationId,
      name,
      regNo,
      gender,
      year,
      degree,
      phone,
      collegeEmail,
      personalEmail,
      dob,
      domain: domain as Domain,
      subdomain: subdomain as Subdomain,
      resumeFileRef,
      portfolioUrl,
      linkedin,
      githubUsername,
      leetcodeUsername,
      awsCertLinks,
      instagramUsername,
      meetupUsername,
      followedLinkedin,
      joinedRecruitmentGroup,
      questionnaire,
      appliedAt: Math.floor(Date.now() / 1000),
    });

    // Evaluate synchronously so the recruiter sees a score immediately. Failure
    // here must not lose the application — it's already persisted above.
    try {
      const result = await evaluateApplication({
        domain: domain as Domain,
        subdomain: subdomain as Subdomain,
        year,
        resumeBuffer: buffer,
        questionnaire,
        portfolioUrl,
        githubUsername,
        leetcodeUsername,
        awsCertCount: awsCertLinks.length,
      });
      await repo.updateApplicationEvaluation(applicationId, result);
    } catch (err) {
      console.error("Evaluation failed (application still saved):", err);
    }

    return NextResponse.json({ success: true, applicationId });
  } catch (error) {
    console.error("Application submit error:", error);
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }
}

// ── Protected: list applications for recruiters ────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The user's own visibility scope is the ceiling, not just a suggestion —
  // a Manager can't widen it by passing a different ?domain= in the query.
  const scope = getVisibilityScope(user);
  const { searchParams } = new URL(req.url);
  const filter: ApplicationFilter = {};

  const requestedDomain = searchParams.get("domain");
  const requestedSubdomain = searchParams.get("subdomain");
  const status = searchParams.get("status");

  if (scope.domain) {
    filter.domain = scope.domain;
  } else if (requestedDomain && isValidDomain(requestedDomain)) {
    filter.domain = requestedDomain;
  }

  if (scope.subdomain) {
    filter.subdomain = scope.subdomain;
  } else if (requestedSubdomain) {
    filter.subdomain = requestedSubdomain as Subdomain;
  }

  if (status) filter.status = status as ApplicationStatus;

  const applications = await repo.listApplications(filter);
  return NextResponse.json({ applications });
}

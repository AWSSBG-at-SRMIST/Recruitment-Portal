# AWSSBG Recruitment Portal — AI (Conversational) Edition

Same recruitment portal for **AWS Student Builder Group (AWSSBG) @ SRMIST**, but
candidates **chat with an AI recruiter ("Nova")** instead of filling a static
form. Nova collects every field conversationally — identity, domain/subdomain,
LinkedIn/GitHub, AWS certs, and the subdomain questionnaire — then the candidate
attaches their resume PDF and submits. The recruiter side (OTP login, AI-scored
dashboard, competency radar, pipeline) is identical to the form-based portal.

> Sibling of the form-based `portal/`. Everything below the intake — scoring,
> storage, auth, dashboard — is shared. The only difference is `/apply`: a chat
> UI (`src/app/apply/page.tsx`) driven by the Groq agent in `src/app/api/chat`
> + `src/lib/intake.ts`.

**Requires `GROQ_API_KEY`** — the conversational intake needs the LLM (unlike
the form portal, which degrades to a heuristic). Runs on any port:
`PORT=3002 npm run dev`.

Branding matches the club's [Official-Website](https://github.com/AWSSBG-at-SRMIST/Official-Website);
auth follows the OTP pattern from the club's
[Internal-Dashboard](https://github.com/AWSSBG-at-SRMIST/Internal-Dashboard).

## Domains & subdomains
Mirrors the Internal-Dashboard taxonomy so hires map cleanly later:
- **Technical** — Software Development · AI & Machine Learning · Cloud & DevOps
- **Corporate** — Events & Operations · Sponsorship & Finance · HR & Admin · PR & Marketing
- **Creatives** — Digital Design · Media Production

Each subdomain has its own questionnaire. Technical applicants can add
GitHub/LeetCode usernames — the portal fetches public signals and cross-checks
resume claims (inflation detection).

## Stack
Next.js 16 (App Router, TypeScript) · Tailwind v4 · Radix UI · Groq (scoring) ·
**local SQLite + disk** now, swappable to **DynamoDB + S3** later.

## Storage: local now, AWS later
Everything runs on your laptop for the demo — SQLite (`./portal.db`) + resume
files on disk (`./uploads/`). No AWS needed.

> **⚠ Reminder:** get sign-off from the appropriate club official before
> provisioning the AWS S3 bucket / IAM credentials. Until then, stay on local.

Once AWS is approved, set `STORAGE_BACKEND=aws` and fill the `AWS_*` / `S3_BUCKET`
env vars — `src/lib/repo/aws.ts` already implements the same interface, so no
other code changes.

## Run locally
```bash
npm install
cp .env.example .env.local        # optional: add GROQ_API_KEY, GMAIL creds
npm run dev                        # http://localhost:3000
```

Add a recruiter to the login allowlist (no self-signup):
```bash
npm run seed:recruiter -- "yourname@srmist.edu.in" "Your Name"
```

### Without any keys (pure local demo)
- **No `GROQ_API_KEY`** → candidates still get a deterministic heuristic score
  (questionnaire depth, resume length, GitHub/LeetCode activity, inflation flag).
- **No `GMAIL_USER`/`GMAIL_APP_PASSWORD`** → login OTPs print to the **server
  console** (`[DEV OTP] …`) instead of emailing, so you can still sign in.

## Flow
- Public: `/` landing → `/apply` (open form, requires full identity + resume).
- Recruiter: `/login` (OTP) → `/dashboard` (funnel + per-subdomain counts) →
  `/applications` (filter by domain/subdomain/status, sort by score) →
  `/applications/[id]` (resume, AI evaluation, verified signals, status pipeline:
  Applied → Shortlisted → Interview → Selected/Rejected).

## Env vars
See `.env.example`. Key ones: `STORAGE_BACKEND` (`local`|`aws`), `GROQ_API_KEY`,
`GROQ_MODEL`, `GMAIL_USER`/`GMAIL_APP_PASSWORD`, `GITHUB_TOKEN` (optional, raises
rate limit), and `AWS_*`/`S3_BUCKET` (only for `aws` mode). Default Groq model:
`openai/gpt-oss-20b` (lighter; override with `GROQ_MODEL`, e.g. `openai/gpt-oss-120b`).

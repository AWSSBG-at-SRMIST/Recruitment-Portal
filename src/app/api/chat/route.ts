import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isRealSubdomain } from "@/lib/validation";
import { isRecruitmentOpen } from "@/lib/recruitment-window";
import { buildSystemPrompt, type AgentReply, type ChatMessage } from "@/lib/intake";

// Groq's json_object mode occasionally rejects the model's own output with a
// 400 json_validate_failed when it drifts into plain conversational text
// instead of the schema — but it still hands back that text as
// `failed_generation`. Recovering it beats surfacing a hard error to a
// candidate mid-application.
function recoverFailedGeneration(err: unknown): string | null {
  if (!(err instanceof Groq.APIError)) return null;
  const body = err.error as { error?: { code?: string; failed_generation?: string } } | undefined;
  const inner = body?.error;
  if (inner?.code === "json_validate_failed" && typeof inner.failed_generation === "string") {
    return inner.failed_generation;
  }
  return null;
}

// Drives the conversational intake for one subdomain's questionnaire only —
// everything else (identity, contact, domain/subdomain, links) is a real
// form field on the client. The client sends the running message history
// plus whatever answers are collected so far; the Groq agent returns its
// next message, the merged answers, and whether it's ready to submit.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "You must be signed in to chat with Nova." }, { status: 401 });

    if (!isRecruitmentOpen()) {
      return NextResponse.json({ error: "Applications are not currently open." }, { status: 403 });
    }

    // Same shared-campus-IP reasoning as the other routes — many concurrent
    // Nova conversations from the same WiFi easily add up past a low ceiling.
    if (!(await checkRateLimit(`chat:${getClientIp(req)}`, 200, 10 * 60))) {
      return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
    }

    const groq = getGroq();
    if (!groq) {
      return NextResponse.json(
        { error: "The recruitment chatbot is offline (no GROQ_API_KEY configured)." },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      messages: ChatMessage[];
      questionnaire: Record<string, string>;
      subdomain: string;
    };
    if (!isRealSubdomain(body.subdomain)) {
      return NextResponse.json({ error: "Pick a domain and subdomain first." }, { status: 400 });
    }
    const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
    const questionnaire = body.questionnaire ?? {};
    const questions = await repo.getSubdomainQuestions(body.subdomain);

    const chatMessages = [
      { role: "system" as const, content: buildSystemPrompt(body.subdomain, questions) },
      {
        role: "system" as const,
        content: `Answers collected so far (merge new answers into this and return the full object):\n${JSON.stringify(
          questionnaire
        )}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // One retry — Groq occasionally returns a transient error or a body that
    // doesn't parse; a single retry smooths that over for the candidate.
    let raw = "{}";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          temperature: 0.5,
          response_format: { type: "json_object" },
          messages: chatMessages,
        });
        raw = completion.choices[0]?.message?.content ?? "{}";
        break;
      } catch (err) {
        const recovered = recoverFailedGeneration(err);
        if (recovered) {
          raw = JSON.stringify({ message: recovered, readyToSubmit: false });
          break;
        }
        if (attempt === 1) throw err;
      }
    }
    let parsed: AgentReply;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        message: "Sorry, I glitched for a second — could you say that again?",
        questionnaire,
        readyToSubmit: false,
        totalQuestions: questions.length,
      });
    }

    return NextResponse.json({
      message: parsed.message || "…",
      questionnaire: { ...questionnaire, ...(parsed.questionnaire ?? {}) },
      readyToSubmit: !!parsed.readyToSubmit,
      // Question labels/text stay conversational-only (never sent to the
      // client as a list) — just the count, so the UI can show progress
      // without turning this back into a static form.
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Something went wrong talking to the recruitment chatbot." }, { status: 500 });
  }
}

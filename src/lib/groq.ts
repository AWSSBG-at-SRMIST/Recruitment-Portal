import Groq from "groq-sdk";

// Groq is the single LLM used for candidate evaluation (same as Hiresense's
// primary path). If GROQ_API_KEY is unset, callers fall back to a
// deterministic heuristic score so the portal still works for the demo.

let client: Groq | null = null;

export function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

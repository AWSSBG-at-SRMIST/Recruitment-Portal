import DOMMatrixPolyfill from "dommatrix";
import { findSkillsInText } from "./scoring/skill-dictionary";

// pdfjs-dist (used internally by pdf-parse) references the browser-only
// DOMMatrix global even for plain text extraction, which crashes on Vercel's
// Node.js serverless runtime the moment pdf-parse is loaded — before any of
// this file's own try/catch ever runs. Polyfill it here, at module-load
// time, then load pdf-parse dynamically below so it's guaranteed to see the
// polyfill already in place.
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Mirrors Hiresense's backend/services/resume_parser.py — extracts raw text
// and the identity/signal fields we care about (email, phone, GitHub &
// LeetCode usernames, detected skills) from a PDF resume buffer.

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_PATTERN = /[+]?[\d][\d\s\-()]{8,}\d/;
const GITHUB_PATTERN = /github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/i;
const LEETCODE_PATTERN = /leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i;

export interface ParsedResume {
  rawText: string;
  email: string | null;
  phone: string | null;
  githubUsername: string | null;
  leetcodeUsername: string | null;
  skills: string[];
  parseError?: string;
}

export async function parseResume(buffer: Buffer): Promise<ParsedResume> {
  let rawText = "";
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    rawText = result.text || "";
  } catch (err) {
    return {
      rawText: "",
      email: null,
      phone: null,
      githubUsername: null,
      leetcodeUsername: null,
      skills: [],
      parseError: err instanceof Error ? err.message : "Failed to parse PDF",
    };
  }

  if (rawText.trim().length < 20) {
    return {
      rawText,
      email: null,
      phone: null,
      githubUsername: null,
      leetcodeUsername: null,
      skills: [],
      parseError: "Could not extract meaningful text from PDF",
    };
  }

  return {
    rawText,
    email: rawText.match(EMAIL_PATTERN)?.[0] ?? null,
    phone: rawText.match(PHONE_PATTERN)?.[0]?.trim() ?? null,
    githubUsername: rawText.match(GITHUB_PATTERN)?.[1] ?? null,
    leetcodeUsername: rawText.match(LEETCODE_PATTERN)?.[1] ?? null,
    skills: findSkillsInText(rawText),
  };
}

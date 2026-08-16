import type { QuestionDef, Subdomain } from "@/types";

export type { QuestionDef };

// Seed data only — the live source of truth is the sbg-recruitment-questions
// DynamoDB table (repo.getSubdomainQuestions), which each subdomain's
// Manager can edit. This is what a fresh table gets seeded with, and what
// local-SQLite dev mode falls back to before any Manager has customized
// their subdomain. Keep ids stable — they key the stored answers map on
// already-submitted applications.

const COMMON: QuestionDef[] = [
  {
    id: "motivation",
    label: "Why do you want to join this domain at AWS SBG at SRMIST?",
    placeholder: "What draws you to this specific team?",
    type: "textarea",
  },
  {
    id: "commitment",
    label: "How many hours a week can you commit, and are you part of any other clubs?",
    type: "text",
  },
];

export const DEFAULT_SUBDOMAIN_QUESTIONS: Record<Subdomain, QuestionDef[]> = {
  "Software Development": [
    {
      id: "project",
      label: "Describe a software project you built and shipped. What was your exact role?",
      placeholder: "Stack, what you owned, what broke and how you fixed it.",
      type: "textarea",
    },
    {
      id: "stack",
      label: "Which languages/frameworks are you most comfortable with?",
      type: "text",
    },
    ...COMMON,
  ],
  "AI & Machine Learning": [
    {
      id: "project",
      label: "Describe an ML/AI project you worked on. What problem, data, and model?",
      placeholder: "Dataset, approach, frameworks (PyTorch/TF/sklearn), results.",
      type: "textarea",
    },
    {
      id: "tools",
      label: "Which ML tools/libraries have you used hands-on?",
      type: "text",
    },
    ...COMMON,
  ],
  "Cloud & DevOps": [
    {
      id: "experience",
      label: "Describe any hands-on experience with cloud (AWS/Azure/GCP), Docker, CI/CD, or Linux.",
      placeholder: "What did you deploy or automate? Which services?",
      type: "textarea",
    },
    {
      id: "tools",
      label: "Which cloud/DevOps tools have you touched?",
      type: "text",
    },
    ...COMMON,
  ],
  "Events & Operations": [
    {
      id: "scenario",
      label: "A flagship event is in 2 days and your venue cancels. Walk through your plan.",
      placeholder: "Prioritise, delegate, communicate — be concrete.",
      type: "textarea",
    },
    {
      id: "experience",
      label: "What events have you organised or volunteered for before?",
      type: "textarea",
    },
    ...COMMON,
  ],
  "Sponsorship & Finance": [
    {
      id: "pitch",
      label: "Write a short cold outreach pitch to a potential sponsor for an AWS SBG at SRMIST event.",
      placeholder: "2-4 sentences. Assume you're emailing a company's marketing lead.",
      type: "textarea",
    },
    {
      id: "negotiation",
      label: "A sponsor offers half the amount you asked for. How do you respond?",
      type: "textarea",
    },
    ...COMMON,
  ],
  "HR & Admin": [
    {
      id: "scenario",
      label: "Two team members clash and it's affecting a deadline. How do you handle it?",
      placeholder: "Your approach to conflict resolution.",
      type: "textarea",
    },
    {
      id: "experience",
      label: "Any experience with people management, coordination, or admin work?",
      type: "textarea",
    },
    ...COMMON,
  ],
  "PR & Marketing": [
    {
      id: "campaign",
      label: "Pitch a social media campaign idea to boost signups for an AWS SBG at SRMIST workshop.",
      placeholder: "Platform, hook, content format, why it works.",
      type: "textarea",
    },
    {
      id: "copy",
      label: "Write a one-line caption for an Instagram post announcing our recruitment drive.",
      type: "text",
    },
    ...COMMON,
  ],
  "Digital Design": [
    {
      id: "portfolio_note",
      label: "Describe a design piece you're proud of and the thinking behind it.",
      placeholder: "Brief, constraints, tools (Figma/Illustrator/Photoshop), outcome.",
      type: "textarea",
    },
    {
      id: "tools",
      label: "Which design tools are you fluent in?",
      type: "text",
    },
    ...COMMON,
  ],
  "Media Production": [
    {
      id: "portfolio_note",
      label: "Describe a video/photo project you produced. What was your role?",
      placeholder: "Shoot/edit, tools (Premiere/DaVinci/After Effects), result.",
      type: "textarea",
    },
    {
      id: "tools",
      label: "Which production/editing tools do you use?",
      type: "text",
    },
    ...COMMON,
  ],
};

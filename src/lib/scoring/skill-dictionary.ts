// Ported from Hiresense's backend/services/skill_dictionary.py — a canonical
// list of technical skills used to detect what a Technical-domain applicant
// mentions in their resume, and to cross-check against verified GitHub
// languages (see inflation detection in github.ts).

export const SKILL_CATEGORIES: Record<string, string[]> = {
  languages: [
    "python", "javascript", "typescript", "java", "c++", "c#", "c", "go", "golang",
    "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "dart",
    "sql", "html", "css", "sass", "bash", "shell", "powershell",
  ],
  frontend: [
    "react", "reactjs", "react.js", "angular", "vue", "vue.js", "svelte",
    "next.js", "nextjs", "nuxt", "gatsby", "tailwind", "tailwindcss", "bootstrap",
    "redux", "zustand", "webpack", "vite", "three.js",
  ],
  backend: [
    "node.js", "nodejs", "express", "express.js", "fastapi", "flask", "django",
    "spring", "spring boot", "rails", "laravel", "asp.net", ".net", "nestjs",
    "graphql",
  ],
  databases: [
    "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite",
    "elasticsearch", "cassandra", "dynamodb", "firebase", "supabase", "neo4j",
    "prisma", "sequelize", "mongoose",
  ],
  devops: [
    "docker", "kubernetes", "k8s", "aws", "amazon web services", "azure", "gcp",
    "google cloud", "terraform", "ansible", "jenkins", "github actions",
    "gitlab ci", "ci/cd", "nginx", "linux", "helm", "prometheus", "grafana",
    "cloudflare", "vercel", "netlify", "heroku",
  ],
  ml_ai: [
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
    "sklearn", "keras", "pandas", "numpy", "scipy", "nlp",
    "natural language processing", "computer vision", "opencv", "llm",
    "transformers", "hugging face", "huggingface", "bert", "gpt", "langchain",
    "openai", "generative ai", "reinforcement learning", "neural network", "cnn",
    "rnn", "lstm", "gan", "data science", "spark", "hadoop", "airflow", "tableau",
    "power bi", "matplotlib",
  ],
  mobile: [
    "react native", "flutter", "ios", "android", "swiftui", "jetpack compose",
    "ionic", "expo",
  ],
  tools: [
    "git", "github", "gitlab", "jira", "figma", "postman", "kafka", "rabbitmq",
    "celery", "websocket", "rest api", "microservices", "agile", "scrum", "tdd",
    "jest", "pytest", "cypress", "selenium", "playwright",
  ],
  security: [
    "oauth", "oauth2", "jwt", "authentication", "encryption", "ssl", "tls",
    "cors", "csrf", "penetration testing", "owasp", "cybersecurity",
  ],
};

export const ALL_SKILLS: string[] = Array.from(
  new Set(Object.values(SKILL_CATEGORIES).flat())
).sort();

export function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/[-_]/g, " ");
}

// Match a skill as a whole token (word-boundary) so "r" doesn't match inside
// "react" and "go" doesn't match inside "google".
export function findSkillsInText(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found = new Set<string>();
  for (const skill of ALL_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (re.test(lower)) found.add(skill);
  }
  return Array.from(found);
}

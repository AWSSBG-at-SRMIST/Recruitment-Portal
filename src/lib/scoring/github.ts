import type { VerifiedSignals, GithubSubScores } from "@/types";

// Fetches public GitHub signals for a Technical-domain applicant — the
// languages they actually push code in, repo count, followers. Mirrors
// Hiresense's github_analyzer.py. GITHUB_TOKEN is optional (raises the
// unauthenticated 60/hr rate limit to 5000/hr).

const GITHUB_API = "https://api.github.com";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "awssbg-recruitment-portal",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

export interface GithubSignals {
  found: boolean;
  publicRepos: number;
  followers: number;
  totalStars: number;
  lastActive: string | null; // ISO date of the most recent push across repos
  languages: Record<string, number>; // language -> total bytes across public repos
  subScores: GithubSubScores;
}

// Turn raw counts into 0-100 sub-scores, mirroring Hiresense's GitHub activity
// breakdown (Tech Breadth / Project Depth / Recency).
function computeSubScores(
  languageCount: number,
  publicRepos: number,
  lastActive: string | null
): GithubSubScores {
  const techBreadth = Math.min(100, languageCount * 18); // ~5+ languages = maxed
  const projectDepth = Math.min(100, publicRepos * 8); // ~12+ repos = maxed
  let recency = 0;
  if (lastActive) {
    const days = (Date.now() - new Date(lastActive).getTime()) / 86400000;
    recency = days <= 30 ? 100 : days <= 90 ? 75 : days <= 180 ? 50 : days <= 365 ? 25 : 5;
  }
  return { techBreadth, projectDepth, recency };
}

export async function fetchGithubSignals(username: string): Promise<GithubSignals | null> {
  try {
    const userRes = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
      headers: authHeaders(),
    });
    if (!userRes.ok) {
      return {
        found: false,
        publicRepos: 0,
        followers: 0,
        totalStars: 0,
        lastActive: null,
        languages: {},
        subScores: { techBreadth: 0, projectDepth: 0, recency: 0 },
      };
    }
    const user = await userRes.json();

    const reposRes = await fetch(
      `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`,
      { headers: authHeaders() }
    );
    const repos: Array<{
      language: string | null;
      size: number;
      fork: boolean;
      stargazers_count?: number;
      pushed_at?: string;
    }> = reposRes.ok ? await reposRes.json() : [];

    // Aggregate primary language across non-forked repos, weighted by repo size
    // as a cheap proxy for "how much they actually write in it".
    const languages: Record<string, number> = {};
    let totalStars = 0;
    let lastActive: string | null = null;
    for (const repo of repos) {
      totalStars += repo.stargazers_count ?? 0;
      if (repo.pushed_at && (!lastActive || repo.pushed_at > lastActive)) lastActive = repo.pushed_at;
      if (repo.fork || !repo.language) continue;
      languages[repo.language] = (languages[repo.language] || 0) + (repo.size || 1);
    }

    const publicRepos = user.public_repos ?? repos.length;

    return {
      found: true,
      publicRepos,
      followers: user.followers ?? 0,
      totalStars,
      lastActive,
      languages,
      subScores: computeSubScores(Object.keys(languages).length, publicRepos, lastActive),
    };
  } catch {
    return null;
  }
}

// Compares resume skill claims against actual GitHub languages. If the resume
// leans heavily on languages the candidate has zero public code in, flag it —
// same idea as Hiresense's inflation_detector.py.
export function detectInflation(
  claimedSkills: string[],
  githubLanguages: Record<string, number>
): { inflationFlag: boolean; inflationNote: string } {
  const ghLangs = new Set(Object.keys(githubLanguages).map((l) => l.toLowerCase()));
  if (ghLangs.size === 0) {
    return { inflationFlag: false, inflationNote: "No public GitHub language data to cross-check." };
  }

  // Only cross-check claims that are actual programming languages we'd expect
  // to show up on GitHub (skip frameworks/tools/soft skills).
  const languageClaims = claimedSkills.filter((s) =>
    ["python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "scala"].includes(s.toLowerCase())
  );
  if (languageClaims.length === 0) {
    return { inflationFlag: false, inflationNote: "No language-level claims to verify." };
  }

  const unverified = languageClaims.filter((s) => {
    const norm = s.toLowerCase() === "golang" ? "go" : s.toLowerCase();
    return !ghLangs.has(norm);
  });

  if (unverified.length >= Math.ceil(languageClaims.length / 2)) {
    return {
      inflationFlag: true,
      inflationNote: `Resume claims ${languageClaims.join(", ")} but public GitHub shows no code in ${unverified.join(", ")}.`,
    };
  }
  return { inflationFlag: false, inflationNote: "Resume language claims broadly match public GitHub activity." };
}

export function githubToSignals(
  gh: GithubSignals,
  inflation: { inflationFlag: boolean; inflationNote: string }
): Partial<VerifiedSignals> {
  return {
    githubLanguages: gh.languages,
    githubPublicRepos: gh.publicRepos,
    githubFollowers: gh.followers,
    githubTotalStars: gh.totalStars,
    githubLastActive: gh.lastActive,
    githubSubScores: gh.subScores,
    inflationFlag: inflation.inflationFlag,
    inflationNote: inflation.inflationNote,
  };
}

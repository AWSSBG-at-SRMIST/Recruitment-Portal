// Fetches public LeetCode problem-solving stats via the GraphQL endpoint —
// mirrors Hiresense's leetcode_analyzer.py. No auth required.

const GRAPHQL_URL = "https://leetcode.com/graphql";

const PROFILE_QUERY = `
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    profile { ranking }
  }
}`;

export interface LeetcodeSignals {
  found: boolean;
  solved: { easy: number; medium: number; hard: number };
  ranking: number | null;
}

export async function fetchLeetcodeSignals(username: string): Promise<LeetcodeSignals | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({ query: PROFILE_QUERY, variables: { username } }),
    });
    if (!res.ok) return { found: false, solved: { easy: 0, medium: 0, hard: 0 }, ranking: null };

    const data = await res.json();
    const matched = data?.data?.matchedUser;
    if (!matched) return { found: false, solved: { easy: 0, medium: 0, hard: 0 }, ranking: null };

    const counts: Array<{ difficulty: string; count: number }> =
      matched.submitStatsGlobal?.acSubmissionNum ?? [];
    const byDiff = (d: string) => counts.find((c) => c.difficulty === d)?.count ?? 0;

    return {
      found: true,
      solved: { easy: byDiff("Easy"), medium: byDiff("Medium"), hard: byDiff("Hard") },
      ranking: matched.profile?.ranking ?? null,
    };
  } catch {
    return null;
  }
}

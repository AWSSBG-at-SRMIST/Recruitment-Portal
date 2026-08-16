import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { MemberRole, SessionUser } from "@/types";

// Member identity is not a separate account system — it IS the club's real
// membership record. This always queries Internal-Dashboard's own
// sbg-members table (same AWS account/region), regardless of
// STORAGE_BACKEND, so any member logs in here with the exact same email
// their Internal-Dashboard account uses — no separate signup or allowlist.
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" });
const db = DynamoDBDocumentClient.from(client);

const MEMBERS_TABLE = "sbg-members";

// Returns null for: no such member, or an inactive one. Role-based access
// (admin dashboard vs. applicant chat) is decided by callers via
// lib/permissions.ts — every active role, including Associate/Builder, is
// returned here since anyone with a real member record is a valid login.
export async function getMemberByEmail(email: string): Promise<SessionUser | null> {
  const result = await db.send(
    new QueryCommand({
      TableName: MEMBERS_TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "officialEmail = :email",
      ExpressionAttributeValues: { ":email": email },
    })
  );

  const member = result.Items?.[0];
  if (!member) return null;
  if (member.isActive === false) return null;

  return {
    memberId: member.memberId,
    name: member.name,
    email: member.officialEmail,
    role: member.role as MemberRole,
    domain: member.domain ?? null,
    subdomain: member.subdomain ?? null,
  };
}

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { MemberRole, SessionUser } from "@/types";

// Member identity is not a separate account system — it IS the club's real
// membership record. This always queries Internal-Dashboard's own
// sbg-members table (same AWS account/region), so any member logs in here
// with the exact same email their Internal-Dashboard account uses — no
// separate signup or allowlist.
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" });
const db = DynamoDBDocumentClient.from(client);

const MEMBERS_TABLE = "sbg-members";
const OBSERVERS_TABLE = "sbg-recruitment-observers";

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

// Faculty/industry mentors — not club members (no entry in sbg-members, no
// memberId, no domain/subdomain), but they should be able to see every
// application read-only. Lives in its own DynamoDB table (same account,
// same pattern as everything else) rather than hardcoded in source, so
// adding/removing one is a data change, not a redeploy.
export async function getObserverByEmail(email: string): Promise<SessionUser | null> {
  const result = await db.send(new GetCommand({ TableName: OBSERVERS_TABLE, Key: { email } }));
  if (!result.Item) return null;

  return {
    memberId: null,
    name: result.Item.name || "Faculty Mentor",
    email,
    role: "OBSERVER",
    domain: null,
    subdomain: null,
  };
}

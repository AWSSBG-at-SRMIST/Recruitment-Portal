import { NextRequest } from "next/server";
import { repo } from "./repo";

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Rightmost IP is added by the platform's load balancer, not spoofable by the client.
    const ips = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    return ips[ips.length - 1] || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  return repo.checkRateLimit(key, limit, windowSeconds);
}

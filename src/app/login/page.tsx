import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in — the login form has nothing to offer, send them
  // straight to wherever their session actually belongs.
  const user = await getCurrentUser();
  if (user) {
    const { next } = await searchParams;
    redirect(isAdmin(user) ? next || "/dashboard" : "/apply");
  }

  return <LoginForm />;
}

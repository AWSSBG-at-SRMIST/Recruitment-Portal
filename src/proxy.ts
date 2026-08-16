import { NextRequest, NextResponse } from "next/server";

// Injects the current pathname as a request header so the (portal) layout's
// server component can read it via headers() and preserve deep-link URLs
// (?next=...) on auth redirects.
export function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

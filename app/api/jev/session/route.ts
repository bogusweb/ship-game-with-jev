import { mintPlaySession } from "@/lib/security/jev-http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const result = mintPlaySession({
    headers: request.headers,
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });
  const response = NextResponse.json(result.json, { status: result.status });
  response.headers.set("Cache-Control", "no-store");
  if (result.setCookie) {
    response.headers.append("Set-Cookie", result.setCookie);
  }
  if (result.retryAfterSec) {
    response.headers.set("Retry-After", String(result.retryAfterSec));
  }
  return response;
}

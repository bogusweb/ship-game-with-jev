import type { Handler, HandlerEvent } from "@netlify/functions";
import {
  mintPlaySession,
  processJevShotRequest,
  type HttpResult,
} from "../../lib/security/jev-http";
import { headerMapFromRecord } from "../../lib/security/request-meta";

declare const Netlify: {
  env: {
    get(key: string): string | undefined;
  };
};

function apiKey(): string | undefined {
  try {
    return Netlify.env.get("SHIP_GAME_TYPESAFE_API_KEY") ?? process.env.SHIP_GAME_TYPESAFE_API_KEY;
  } catch {
    return process.env.SHIP_GAME_TYPESAFE_API_KEY;
  }
}

function cookieOf(event: HandlerEvent): string | undefined {
  return event.headers.cookie ?? event.headers.Cookie;
}

function fromResult(result: HttpResult) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (result.setCookie) headers["Set-Cookie"] = result.setCookie;
  if (result.retryAfterSec) headers["Retry-After"] = String(result.retryAfterSec);
  return {
    statusCode: result.status,
    headers,
    body: JSON.stringify(result.json),
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const result = await processJevShotRequest({
    headers: headerMapFromRecord(event.headers),
    cookieHeader: cookieOf(event),
    bodyText: event.body ?? "",
    apiKey: apiKey(),
  });
  return fromResult(result);
};

export const sessionHandler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  return fromResult(
    mintPlaySession({
      headers: headerMapFromRecord(event.headers),
      cookieHeader: cookieOf(event),
    }),
  );
};

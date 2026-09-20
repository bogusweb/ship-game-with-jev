import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SessionPayload = {
  s: string;
  t: number;
  n: number;
};

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromB64url(value: string): Buffer {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(secret: string, payload: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function newSessionId(): string {
  return randomBytes(16).toString("hex");
}

export function mintSessionToken(
  secret: string,
  payload: SessionPayload,
): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(secret, body)}`;
}

export function parseSessionToken(
  secret: string,
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (
      typeof parsed.s !== "string" ||
      parsed.s.length < 16 ||
      typeof parsed.t !== "number" ||
      typeof parsed.n !== "number" ||
      parsed.n < 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return undefined;
}

export function serializeSessionCookie(opts: {
  name: string;
  token: string;
  maxAgeSec: number;
  secure: boolean;
}): string {
  const parts = [
    `${opts.name}=${opts.token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts.maxAgeSec}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

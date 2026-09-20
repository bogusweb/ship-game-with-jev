export type HeaderMap = {
  get(name: string): string | null;
};

export function headerMapFromRecord(
  headers: Record<string, string | undefined> | undefined,
): HeaderMap {
  const lower: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === "string") lower[key.toLowerCase()] = value;
  }
  return {
    get(name: string) {
      return lower[name.toLowerCase()] ?? null;
    },
  };
}

function firstHop(value: string | null): string | null {
  if (!value) return null;
  const hop = value.split(",")[0]?.trim();
  return hop && hop.length > 0 ? hop : null;
}

export function clientIp(headers: HeaderMap, fallback = "unknown"): string {
  return (
    firstHop(headers.get("x-forwarded-for")) ||
    firstHop(headers.get("x-real-ip")) ||
    firstHop(headers.get("cf-connecting-ip")) ||
    firstHop(headers.get("x-nf-client-connection-ip")) ||
    fallback
  );
}

export function requestOrigin(headers: HeaderMap): string | null {
  const origin = headers.get("origin");
  if (origin) return origin;
  const referer = headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function hostOrigin(headers: HeaderMap): string | null {
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (!host) return null;
  const proto =
    headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function originAllowed(
  headers: HeaderMap,
  allowedOrigins: string[],
): boolean {
  const origin = requestOrigin(headers);
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  const host = hostOrigin(headers);
  return host !== null && origin === host;
}

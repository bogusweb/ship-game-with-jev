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

export function parseHostname(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`http://${value}`);
    return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isLoopbackHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0:0:0:0:0:0:0:1" ||
    h === "::ffff:127.0.0.1" ||
    h.startsWith("127.") ||
    h.endsWith(".localhost")
  );
}

export function isLoopbackRequest(headers: HeaderMap): boolean {
  const hostHeader = headers.get("x-forwarded-host") || headers.get("host");
  if (!isLoopbackHostname(parseHostname(hostHeader))) return false;
  const origin = requestOrigin(headers);
  if (!origin) return true;
  return isLoopbackHostname(parseHostname(origin));
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
  const hostName = parseHostname(host);
  const proto =
    headers.get("x-forwarded-proto") ||
    (isLoopbackHostname(hostName) ? "http" : "https");
  return `${proto}://${host}`;
}

export function originAllowed(
  headers: HeaderMap,
  allowedOrigins: string[],
): boolean {
  if (isLoopbackRequest(headers)) return true;
  const origin = requestOrigin(headers);
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  const host = hostOrigin(headers);
  return host !== null && origin === host;
}

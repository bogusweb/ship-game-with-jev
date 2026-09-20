function readInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function deriveSecret(env: NodeJS.ProcessEnv): string {
  const explicit = env.SHIP_GAME_SESSION_SECRET;
  if (explicit) return explicit;
  const apiKey = env.SHIP_GAME_TYPESAFE_API_KEY;
  if (apiKey) return `sgj:${apiKey}`;
  return "dev-only-session-secret";
}

export type AbuseConfig = {
  sessionSecret: string;
  cookieName: string;
  sessionTtlMs: number;
  sessionPaidBudget: number;
  ipPaidPerHour: number;
  ipRequestsPerMinute: number;
  dailyPaidBudget: number;
  minPaidIntervalMs: number;
  sessionMintsPerHour: number;
  maxBodyBytes: number;
  enforceOrigin: boolean;
  allowedOrigins: string[];
  jevDisabled: boolean;
  budgetFile: string | null;
};

export function loadAbuseConfig(
  env: NodeJS.ProcessEnv = process.env,
): AbuseConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const allowed = (env.SHIP_GAME_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    sessionSecret: deriveSecret(env),
    cookieName: "sgj_session",
    sessionTtlMs: readInt(env, "SHIP_GAME_SESSION_TTL_MS", 4 * 60 * 60 * 1000),
    sessionPaidBudget: readInt(env, "SHIP_GAME_JEV_SESSION_BUDGET", 240),
    ipPaidPerHour: readInt(env, "SHIP_GAME_JEV_IP_HOURLY", 300),
    ipRequestsPerMinute: readInt(env, "SHIP_GAME_JEV_IP_PER_MINUTE", 60),
    dailyPaidBudget: readInt(env, "SHIP_GAME_JEV_DAILY_BUDGET", 2000),
    minPaidIntervalMs: readInt(env, "SHIP_GAME_JEV_MIN_INTERVAL_MS", 150),
    sessionMintsPerHour: readInt(env, "SHIP_GAME_SESSION_MINTS_HOURLY", 20),
    maxBodyBytes: readInt(env, "SHIP_GAME_JEV_MAX_BODY_BYTES", 24 * 1024),
    enforceOrigin: nodeEnv === "production" && env.SHIP_GAME_SKIP_ORIGIN !== "1",
    allowedOrigins: allowed,
    jevDisabled:
      env.SHIP_GAME_JEV_DISABLED === "1" || env.SHIP_GAME_JEV_DISABLED === "true",
    budgetFile: env.SHIP_GAME_BUDGET_FILE || null,
  };
}

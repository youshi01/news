import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/lib/env";
import { getDataDir } from "@/lib/runtime-config";

export const ADMIN_SESSION_COOKIE = "news_admin_session";

const DEFAULT_ADMIN_PATH = "/manage-8f3k2";
const DEFAULT_ADMIN_USER = "admin";
const DEFAULT_ADMIN_PASSWORD = "ChangeMe_2026_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type AdminSecurityConfig = {
  adminPath?: string;
  username?: string;
  passwordHash?: string;
  securityVersion?: string;
  updatedAt?: string;
};

type AdminSecurity = {
  adminPath: string;
  username: string;
  passwordHash?: string;
  envPassword: string;
  securityVersion: string;
};

export function getAdminSecurityConfigPath() {
  return path.join(getDataDir(), "admin.json");
}

export function normalizeAdminPath(input?: string, fallback = DEFAULT_ADMIN_PATH) {
  const raw = input?.trim() || fallback;
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = withSlash.replace(/\/+$/, "");

  if (
    !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(normalized) ||
    normalized === "/api" ||
    normalized.startsWith("/api/") ||
    normalized === "/_next" ||
    normalized.startsWith("/_next/") ||
    normalized === "/install"
  ) {
    return fallback;
  }

  return normalized || fallback;
}

export function readAdminSecurityConfig(): AdminSecurityConfig {
  try {
    const file = fs.readFileSync(getAdminSecurityConfigPath(), "utf8");
    return JSON.parse(file) as AdminSecurityConfig;
  } catch {
    return {};
  }
}

function writeAdminSecurityConfig(config: AdminSecurityConfig) {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    getAdminSecurityConfigPath(),
    JSON.stringify(config, null, 2),
    {
      encoding: "utf8",
      mode: 0o600
    }
  );
}

function hashText(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomVersion() {
  return crypto.randomBytes(16).toString("hex");
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminSecurity(): AdminSecurity {
  const config = readAdminSecurityConfig();
  const envPath = getEnv("ADMIN_PATH", DEFAULT_ADMIN_PATH);
  const username = config.username || getEnv("ADMIN_USER", DEFAULT_ADMIN_USER);
  const envPassword = getEnv("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD);
  const adminPath = normalizeAdminPath(config.adminPath || envPath);
  const versionSource = config.securityVersion ||
    hashText(`env:${adminPath}:${username}:${config.passwordHash || envPassword}`).slice(0, 32);

  return {
    adminPath,
    username,
    passwordHash: config.passwordHash,
    envPassword,
    securityVersion: versionSource
  };
}

export function getCurrentAdminPath() {
  return getAdminSecurity().adminPath;
}

export function hashAdminPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPasswordHash(password: string, storedHash: string) {
  const [scheme, salt, expected] = storedHash.split(":");

  if (scheme !== "scrypt" || !salt || !expected) {
    return false;
  }

  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return secureCompare(actual, expected);
}

export function verifyAdminPassword(username: string, password: string) {
  const security = getAdminSecurity();

  if (!secureCompare(username, security.username)) {
    return false;
  }

  if (security.passwordHash) {
    return verifyPasswordHash(password, security.passwordHash);
  }

  return secureCompare(password, security.envPassword);
}

function sessionSecret(security = getAdminSecurity()) {
  return getEnv("ADMIN_SESSION_SECRET") ||
    hashText(`${security.adminPath}:${security.username}:${security.passwordHash || security.envPassword}`);
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string) {
  const padded = input.padEnd(input.length + ((4 - input.length % 4) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function signPayload(payload: string, security = getAdminSecurity()) {
  return base64Url(crypto.createHmac("sha256", sessionSecret(security)).update(payload).digest());
}

export function createAdminSessionValue() {
  const security = getAdminSecurity();
  const payload = base64Url(JSON.stringify({
    sub: security.username,
    ver: security.securityVersion,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  }));
  const signature = signPayload(payload, security);

  return `${payload}.${signature}`;
}

export function verifyAdminSessionValue(value?: string) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const security = getAdminSecurity();
  const expectedSignature = signPayload(payload, security);

  if (!secureCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const data = JSON.parse(fromBase64Url(payload)) as {
      sub?: string;
      ver?: string;
      exp?: number;
    };

    if (
      data.sub !== security.username ||
      data.ver !== security.securityVersion ||
      !data.exp ||
      data.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      username: security.username
    };
  } catch {
    return null;
  }
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

export function useSecureAdminCookie() {
  return getEnv("ADMIN_COOKIE_SECURE") === "true";
}

export function updateAdminCredentials(input: {
  currentPassword: string;
  username: string;
  newPassword?: string;
}) {
  const current = getAdminSecurity();
  const username = input.username.trim();
  const newPassword = input.newPassword?.trim() || "";

  if (!verifyAdminPassword(current.username, input.currentPassword)) {
    return { ok: false, error: "password" } as const;
  }

  if (!/^[a-zA-Z0-9_.@-]{3,80}$/.test(username)) {
    return { ok: false, error: "username" } as const;
  }

  if (newPassword && newPassword.length < 8) {
    return { ok: false, error: "new-password" } as const;
  }

  const config = readAdminSecurityConfig();
  writeAdminSecurityConfig({
    ...config,
    adminPath: current.adminPath,
    username,
    passwordHash: newPassword ? hashAdminPassword(newPassword) : config.passwordHash,
    securityVersion: randomVersion(),
    updatedAt: new Date().toISOString()
  });

  return { ok: true } as const;
}

export function updateAdminPath(input: {
  currentPassword: string;
  adminPath: string;
}) {
  const current = getAdminSecurity();

  if (!verifyAdminPassword(current.username, input.currentPassword)) {
    return { ok: false, error: "password" } as const;
  }

  const normalizedPath = normalizeAdminPath(input.adminPath, "");

  if (!normalizedPath) {
    return { ok: false, error: "path" } as const;
  }

  const config = readAdminSecurityConfig();
  writeAdminSecurityConfig({
    ...config,
    adminPath: normalizedPath,
    username: current.username,
    securityVersion: randomVersion(),
    updatedAt: new Date().toISOString()
  });

  return {
    ok: true,
    adminPath: normalizedPath
  } as const;
}

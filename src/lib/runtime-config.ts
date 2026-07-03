import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/lib/env";

type InstallConfig = {
  databaseUrl?: string;
  siteUrl?: string;
  installedAt?: string;
};

export function getDataDir() {
  return getEnv("APP_DATA_DIR", path.join(process.cwd(), "data"));
}

export function getInstallConfigPath() {
  return path.join(getDataDir(), "install.json");
}

export function readInstallConfig(): InstallConfig {
  try {
    const file = fs.readFileSync(getInstallConfigPath(), "utf8");
    return JSON.parse(file) as InstallConfig;
  } catch {
    return {};
  }
}

export function getRuntimeDatabaseUrl() {
  return getEnv("DATABASE_URL") || readInstallConfig().databaseUrl || "";
}

export function getRuntimeSiteUrl() {
  return readInstallConfig().siteUrl || getEnv("SITE_URL", "http://localhost:3000");
}

export function isInstalled() {
  return Boolean(getRuntimeDatabaseUrl());
}

export function writeInstallConfig(config: InstallConfig) {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    getInstallConfigPath(),
    JSON.stringify(
      {
        ...readInstallConfig(),
        ...config
      },
      null,
      2
    ),
    {
      encoding: "utf8",
      mode: 0o600
    }
  );
}

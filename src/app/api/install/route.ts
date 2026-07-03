import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { adminHref } from "@/lib/admin-path";
import { getEnv } from "@/lib/env";
import { isInstalled, writeInstallConfig } from "@/lib/runtime-config";

const DEFAULT_INSTALL_TOKEN = "ChangeMe_Install_2026";

function redirectToAdmin(request: Request) {
  return NextResponse.redirect(new URL(adminHref(), request.url), 303);
}

function cleanField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function escapeIdentifier(value: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return "";
  }

  return `\`${value}\``;
}

function buildDatabaseUrl(input: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}) {
  const user = encodeURIComponent(input.user);
  const password = encodeURIComponent(input.password);
  const host = input.host;
  const database = encodeURIComponent(input.database);

  return `mysql://${user}:${password}@${host}:${input.port}/${database}`;
}

function decodeRouteGateway(hexGateway: string) {
  if (!/^[0-9A-Fa-f]{8}$/.test(hexGateway)) {
    return "";
  }

  const octets = hexGateway
    .match(/../g)
    ?.reverse()
    .map((part) => Number.parseInt(part, 16));

  if (!octets || octets.some((octet) => !Number.isInteger(octet))) {
    return "";
  }

  const gateway = octets.join(".");
  return gateway === "0.0.0.0" ? "" : gateway;
}

function readDockerGatewayHosts() {
  try {
    const routes = fs.readFileSync("/proc/net/route", "utf8");

    return routes
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .filter((columns) => columns[1] === "00000000")
      .map((columns) => decodeRouteGateway(columns[2] || ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function shouldTryDockerHostFallback(host: string) {
  const normalized = host.toLowerCase();

  return [
    "host.docker.internal",
    "gateway.docker.internal",
    "localhost",
    "127.0.0.1"
  ].includes(normalized);
}

function databaseHostCandidates(host: string) {
  if (!shouldTryDockerHostFallback(host)) {
    return [host];
  }

  return uniqueValues([
    host,
    "host.docker.internal",
    "gateway.docker.internal",
    ...readDockerGatewayHosts(),
    "172.17.0.1",
    "172.18.0.1"
  ]);
}

function mysqlErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
}

function isNetworkConnectionError(error: unknown) {
  return [
    "ENOTFOUND",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "PROTOCOL_CONNECTION_LOST"
  ].includes(mysqlErrorCode(error));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function connectToDatabase(input: {
  host: string;
  port: number;
  user: string;
  password: string;
}) {
  const attempts: string[] = [];
  let lastError: unknown;

  for (const candidateHost of databaseHostCandidates(input.host)) {
    try {
      const connection = await mysql.createConnection({
        host: candidateHost,
        port: input.port,
        user: input.user,
        password: input.password,
        multipleStatements: true
      });

      return {
        connection,
        effectiveHost: candidateHost
      };
    } catch (error) {
      lastError = error;
      attempts.push(`${candidateHost}: ${errorMessage(error)}`);

      if (!isNetworkConnectionError(error)) {
        break;
      }
    }
  }

  throw new Error(
    `MySQL 连接失败。已尝试 ${attempts.join("; ") || input.host}。${
      lastError ? `最后错误：${errorMessage(lastError)}` : ""
    }`
  );
}

function readSchemaSql(database: string) {
  const initPath = path.join(process.cwd(), "sql", "init.sql");
  const initSql = fs.readFileSync(initPath, "utf8");

  return initSql.replace(
    /CREATE DATABASE IF NOT EXISTS news_site[\s\S]*?;\s*USE news_site;\s*/i,
    ""
  );
}

async function initializeSchema(connection: mysql.Connection, database: string) {
  const escapedDatabase = escapeIdentifier(database);

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapedDatabase} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
  } catch (error) {
    console.warn("CREATE DATABASE failed, trying to use existing database:", error);
  }

  await connection.query(`USE ${escapedDatabase}`);
  await connection.query(readSchemaSql(database));
}

function databaseErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return encodeURIComponent(error.message.slice(0, 220));
  }

  return "";
}

export async function POST(request: Request) {
  if (isInstalled()) {
    return redirectToAdmin(request);
  }

  const formData = await request.formData();
  const expectedToken = getEnv("INSTALL_TOKEN");
  const submittedToken = cleanField(formData, "installToken");
  const usesDefaultInstallToken =
    !expectedToken || expectedToken === DEFAULT_INSTALL_TOKEN;

  if (
    !usesDefaultInstallToken &&
    submittedToken !== expectedToken
  ) {
    return NextResponse.redirect(new URL("/install?error=token", request.url), 303);
  }

  const host = cleanField(formData, "host");
  const port = Number(cleanField(formData, "port") || 3306);
  const database = cleanField(formData, "database");
  const user = cleanField(formData, "user");
  const password = cleanField(formData, "password");
  const siteUrl = cleanField(formData, "siteUrl") || "http://localhost:3000";
  const escapedDatabase = escapeIdentifier(database);

  if (
    !host ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535 ||
    !database ||
    !escapedDatabase ||
    !user ||
    !password
  ) {
    return NextResponse.redirect(new URL("/install?error=input", request.url), 303);
  }

  let connection: mysql.Connection | null = null;

  try {
    const databaseConnection = await connectToDatabase({
      host,
      port,
      user,
      password
    });
    connection = databaseConnection.connection;

    await initializeSchema(connection, database);

    writeInstallConfig({
      databaseUrl: buildDatabaseUrl({
        host: databaseConnection.effectiveHost,
        port,
        database,
        user,
        password
      }),
      siteUrl,
      installedAt: new Date().toISOString()
    });

    return redirectToAdmin(request);
  } catch (error) {
    console.error("Install failed:", error);
    const detail = databaseErrorDetail(error);
    return NextResponse.redirect(
      new URL(`/install?error=database${detail ? `&detail=${detail}` : ""}`, request.url),
      303
    );
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

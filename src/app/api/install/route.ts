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
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    await initializeSchema(connection, database);

    writeInstallConfig({
      databaseUrl: buildDatabaseUrl({ host, port, database, user, password }),
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

import mysql from "mysql2/promise";
import { getRuntimeDatabaseUrl } from "@/lib/runtime-config";

let pool: mysql.Pool | null = null;
let poolUrl = "";

export function hasDatabase() {
  return Boolean(getRuntimeDatabaseUrl());
}

export function getPool() {
  const databaseUrl = getRuntimeDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  if (!pool || poolUrl !== databaseUrl) {
    pool = mysql.createPool(databaseUrl);
    poolUrl = databaseUrl;
  }

  return pool;
}

export async function query<T extends mysql.RowDataPacket[]>(
  sql: string,
  params: Array<string | number | null | Date> = []
) {
  const db = getPool();

  if (!db) {
    return [] as unknown as T;
  }

  try {
    const [rows] = await db.query<T>(sql, params);
    return rows;
  } catch (error) {
    console.warn("Database query failed:", error);
    return [] as unknown as T;
  }
}

export async function execute(
  sql: string,
  params: Array<string | number | null | Date> = []
) {
  const db = getPool();

  if (!db) {
    return null;
  }

  try {
    const [result] = await db.execute(sql, params);
    return result;
  } catch (error) {
    console.warn("Database execute failed:", error);
    return null;
  }
}

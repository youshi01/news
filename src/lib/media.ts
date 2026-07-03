import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

export type MediaAsset = {
  id: number;
  originalUrl: string;
  sourceUrl: string | null;
  storageType: string;
  status: string;
  createdAt: string;
};

export async function getMediaAssets(limit = 50) {
  const rows = await query<
    Array<
      RowDataPacket & {
        id: number;
        original_url: string;
        source_url: string | null;
        storage_type: string;
        status: string;
        created_at: Date;
      }
    >
  >(
    `
      SELECT id, original_url, source_url, storage_type, status, created_at
      FROM media_assets
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    originalUrl: row.original_url,
    sourceUrl: row.source_url,
    storageType: row.storage_type,
    status: row.status,
    createdAt: row.created_at.toISOString()
  }));
}

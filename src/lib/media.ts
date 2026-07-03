import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

export type MediaAsset = {
  id: number;
  originalUrl: string;
  sourceUrl: string | null;
  assetType: string;
  storageType: string;
  mimeType: string | null;
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
        asset_type: string;
        storage_type: string;
        mime_type: string | null;
        status: string;
        created_at: Date;
      }
    >
  >(
    `
      SELECT id, original_url, source_url, asset_type, storage_type, mime_type, status, created_at
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
    assetType: row.asset_type,
    storageType: row.storage_type,
    mimeType: row.mime_type,
    status: row.status,
    createdAt: row.created_at.toISOString()
  }));
}

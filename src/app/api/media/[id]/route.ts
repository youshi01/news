import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

type MediaRow = RowDataPacket & {
  original_url: string;
  mime_type: string | null;
  status: string;
};

function isSafeRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }

  const rows = await query<MediaRow[]>(
    `
      SELECT original_url, mime_type, status
      FROM media_assets
      WHERE id = ? AND asset_type = 'image'
      LIMIT 1
    `,
    [numericId]
  );

  const media = rows[0];

  if (!media || media.status !== "active" || !isSafeRemoteImageUrl(media.original_url)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const response = await fetch(media.original_url, {
    headers: {
      "user-agent": "SoutheastSignalBot/0.1 (+https://example.com)"
    },
    next: {
      revalidate: 60 * 60 * 24
    }
  });

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || media.mime_type || "image/jpeg";

  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Remote asset is not an image" }, { status: 415 });
  }

  return new Response(response.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800"
    }
  });
}

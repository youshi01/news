import { NextResponse } from "next/server";
import { isInstalled } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "sea-news-hub",
    image: "ghcr.io/youshi01/news",
    installed: isInstalled(),
    time: new Date().toISOString()
  });
}

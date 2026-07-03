import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { SUPPORTED_LOCALES } from "@/lib/locales";

type EventPayload = {
  eventType?: string;
  articleId?: number;
  locale?: string;
  path?: string;
  referrer?: string | null;
  sessionId?: string;
  visitorId?: string;
  deviceType?: string;
  durationSeconds?: number;
  scrollDepth?: number;
  targetUrl?: string;
  targetType?: string;
};

const allowedTrafficEvents = new Set(["page_view", "article_view", "heartbeat"]);
const allowedTargetTypes = new Set(["internal", "outbound"]);

function cleanString(value: unknown, max = 900) {
  if (typeof value !== "string") {
    return null;
  }

  return value.slice(0, max);
}

function cleanPath(value: unknown) {
  const path = cleanString(value, 900) || "/";

  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function cleanLocale(value: unknown) {
  const locale = cleanString(value, 20);

  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return null;
  }

  return locale;
}

function cleanPositiveInteger(value: unknown, max: number) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return Math.min(max, Math.round(number));
}

function cleanUrl(value: unknown) {
  const url = cleanString(value, 900);

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function isSameOrigin(request: Request, host: string | null) {
  const origin = request.headers.get("origin");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > 4096) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const headerList = await headers();
  const host = headerList.get("host");

  if (!isSameOrigin(request, host)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let payload: EventPayload;

  try {
    payload = (await request.json()) as EventPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = cleanString(payload.eventType, 50) || "page_view";
  const country = headerList.get("cf-ipcountry") || null;
  const articleId = cleanPositiveInteger(payload.articleId, 9_999_999_999);
  const locale = cleanLocale(payload.locale);
  const path = cleanPath(payload.path);
  const sessionId = cleanString(payload.sessionId, 100);
  const visitorId = cleanString(payload.visitorId, 100);

  if (eventType === "click") {
    const targetType = cleanString(payload.targetType, 50);

    if (targetType && !allowedTargetTypes.has(targetType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await execute(
      `
        INSERT INTO click_events
          (article_id, locale, path, target_url, target_type, session_id, visitor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        articleId,
        locale,
        path,
        cleanUrl(payload.targetUrl),
        targetType,
        sessionId,
        visitorId
      ]
    );

    return NextResponse.json({ ok: true });
  }

  if (!allowedTrafficEvents.has(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await execute(
    `
      INSERT INTO traffic_events
        (
          event_type,
          article_id,
          locale,
          path,
          referrer,
          session_id,
          visitor_id,
          country,
          device_type,
          duration_seconds,
          scroll_depth
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      eventType,
      articleId,
      locale,
      path,
      cleanString(payload.referrer),
      sessionId,
      visitorId,
      country,
      cleanString(payload.deviceType, 50),
      cleanPositiveInteger(payload.durationSeconds, 60 * 60 * 6),
      cleanPositiveInteger(payload.scrollDepth, 100)
    ]
  );

  return NextResponse.json({ ok: true });
}

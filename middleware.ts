import { NextRequest, NextResponse } from "next/server";
import { ADMIN_RUNTIME_HEADER, getAdminRuntimeSecret } from "@/lib/admin-runtime-secret";
import { getEnv } from "@/lib/env";

const DEFAULT_ADMIN_PATH = "/manage-8f3k2";
const RUNTIME_CACHE_MS = 2000;

let cachedAdminPath = "";
let cachedAdminPathExpiresAt = 0;

function normalizeAdminPath(input?: string, fallback = DEFAULT_ADMIN_PATH) {
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

function getFallbackAdminPath() {
  return normalizeAdminPath(getEnv("ADMIN_PATH", DEFAULT_ADMIN_PATH));
}

function notFound() {
  return new NextResponse("Not found", {
    status: 404
  });
}

function isPathOrChild(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function loginUrl(request: NextRequest, adminPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = `${adminPath}/login`;
  url.searchParams.set("next", request.nextUrl.pathname);
  return url;
}

function rewriteAdmin(request: NextRequest, adminPath: string, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = `/admin${pathname.slice(adminPath.length) || ""}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-internal-admin-rewrite", adminPath);

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders
    }
  });
}

async function fetchRuntime(request: NextRequest, includeCookie: boolean) {
  const headers = new Headers();
  headers.set(ADMIN_RUNTIME_HEADER, getAdminRuntimeSecret());

  if (includeCookie) {
    const cookie = request.headers.get("cookie");

    if (cookie) {
      headers.set("cookie", cookie);
    }
  }

  try {
    const response = await fetch(new URL("/api/admin/runtime", request.url), {
      cache: "no-store",
      headers
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as {
      ok?: boolean;
      adminPath?: string;
      authenticated?: boolean;
    };
  } catch {
    return null;
  }
}

async function getRuntimeAdminPath(request: NextRequest) {
  const now = Date.now();

  if (cachedAdminPath && cachedAdminPathExpiresAt > now) {
    return cachedAdminPath;
  }

  const runtime = await fetchRuntime(request, false);
  const adminPath = normalizeAdminPath(runtime?.adminPath, getFallbackAdminPath());

  cachedAdminPath = adminPath;
  cachedAdminPathExpiresAt = now + RUNTIME_CACHE_MS;

  return adminPath;
}

export async function middleware(request: NextRequest) {
  const adminPath = await getRuntimeAdminPath(request);
  const pathname = request.nextUrl.pathname;
  const isInternalAdminRewrite =
    request.headers.get("x-internal-admin-rewrite") === adminPath;
  const isDefaultAdmin = isPathOrChild(pathname, "/admin");
  const isCustomAdmin = isPathOrChild(pathname, adminPath);

  if (!isDefaultAdmin && !isCustomAdmin) {
    return NextResponse.next();
  }

  if (isDefaultAdmin && adminPath !== "/admin" && !isInternalAdminRewrite) {
    return notFound();
  }

  const effectivePath = isCustomAdmin
    ? pathname
    : `${adminPath}${pathname.slice("/admin".length)}`;
  const isLogin = effectivePath === `${adminPath}/login`;
  const runtime = await fetchRuntime(request, true);
  const authenticated = Boolean(runtime?.authenticated);

  if (!authenticated && !isLogin) {
    return NextResponse.redirect(loginUrl(request, adminPath));
  }

  if (authenticated && isLogin) {
    return NextResponse.redirect(new URL(adminPath, request.url));
  }

  if (isCustomAdmin && adminPath !== "/admin") {
    return rewriteAdmin(request, adminPath, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemap-news.xml|rss.xml).*)"
  ]
};

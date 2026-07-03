import { NextRequest, NextResponse } from "next/server";

function getAdminPath() {
  const raw = process.env.ADMIN_PATH || "/admin";
  const trimmed = raw.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withSlash.replace(/\/+$/, "");

  if (
    !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(normalized) ||
    normalized === "/api" ||
    normalized.startsWith("/api/") ||
    normalized === "/_next" ||
    normalized.startsWith("/_next/")
  ) {
    return "/admin";
  }

  return normalized || "/admin";
}

function notFound() {
  return new NextResponse("Not found", {
    status: 404
  });
}

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"'
    }
  });
}

function decodeBasicAuth(value: string) {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

function parseBasicAuth(value: string) {
  const decoded = decodeBasicAuth(value);
  const separator = decoded.indexOf(":");

  if (separator === -1) {
    return null;
  }

  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1)
  };
}

function secureCompare(left: string, right: string) {
  let mismatch = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

function isPathOrChild(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function middleware(request: NextRequest) {
  const adminPath = getAdminPath();
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

  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  const missingCredentials = !user || !password;

  if (missingCredentials && process.env.NODE_ENV === "production") {
    return notFound();
  }

  const shouldRequireAuth = !missingCredentials;

  if (shouldRequireAuth) {
    const auth = request.headers.get("authorization");

    if (!auth?.startsWith("Basic ")) {
      return unauthorized();
    }

    const credentials = parseBasicAuth(auth.slice(6));

    if (
      !credentials ||
      !secureCompare(credentials.user, user) ||
      !secureCompare(credentials.password, password)
    ) {
      return unauthorized();
    }
  }

  if (isCustomAdmin && adminPath !== "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname.slice(adminPath.length)}`;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-internal-admin-rewrite", adminPath);
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemap-news.xml|rss.xml).*)"
  ]
};

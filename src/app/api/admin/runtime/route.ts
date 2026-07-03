import { NextResponse } from "next/server";
import { ADMIN_RUNTIME_HEADER, getAdminRuntimeSecret } from "@/lib/admin-runtime-secret";
import {
  ADMIN_SESSION_COOKIE,
  getCurrentAdminPath,
  verifyAdminSessionValue
} from "@/lib/admin-security";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false }, { status: 404 });
}

function isInternalRequest(request: Request) {
  return request.headers.get(ADMIN_RUNTIME_HEADER) === getAdminRuntimeSecret();
}

export function GET(request: Request) {
  if (!isInternalRequest(request)) {
    return unauthorized();
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const cookieValue = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  return NextResponse.json({
    ok: true,
    adminPath: getCurrentAdminPath(),
    authenticated: Boolean(verifyAdminSessionValue(cookieValue))
  });
}

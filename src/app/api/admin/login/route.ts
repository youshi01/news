import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminSessionMaxAge,
  getCurrentAdminPath,
  useSecureAdminCookie,
  verifyAdminPassword
} from "@/lib/admin-security";
import { adminHref } from "@/lib/admin-path";

function cleanField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  const adminPath = getCurrentAdminPath();

  if (value === adminPath || value.startsWith(`${adminPath}/`)) {
    return value;
  }

  return adminPath;
}

function redirectResponse(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      location
    }
  });
}

function loginRedirect(error = false) {
  const url = new URL(adminHref("/login"), "http://internal.local");

  if (error) {
    url.searchParams.set("error", "1");
  }

  return redirectResponse(`${url.pathname}${url.search}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = cleanField(formData, "username");
  const password = cleanField(formData, "password");
  const next = safeNextPath(cleanField(formData, "next"));

  if (!verifyAdminPassword(username, password)) {
    return loginRedirect(true);
  }

  const response = redirectResponse(next);
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureAdminCookie(),
    path: "/",
    maxAge: getAdminSessionMaxAge()
  });

  return response;
}

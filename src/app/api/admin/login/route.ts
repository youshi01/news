import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminSessionMaxAge,
  getCurrentAdminPath,
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

function loginRedirect(request: Request, error = false) {
  const url = new URL(adminHref("/login"), request.url);

  if (error) {
    url.searchParams.set("error", "1");
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = cleanField(formData, "username");
  const password = cleanField(formData, "password");
  const next = safeNextPath(cleanField(formData, "next"));

  if (!verifyAdminPassword(username, password)) {
    return loginRedirect(request, true);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminSessionMaxAge()
  });

  return response;
}

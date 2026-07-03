"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminSessionMaxAge,
  getCurrentAdminPath,
  useSecureAdminCookie,
  verifyAdminPassword
} from "@/lib/admin-security";

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

function loginPath(error = false, next = "") {
  const url = new URL(adminHref("/login"), "http://internal.local");

  if (error) {
    url.searchParams.set("error", "1");
  }

  if (next) {
    url.searchParams.set("next", next);
  }

  return `${url.pathname}${url.search}`;
}

export async function loginAction(formData: FormData) {
  const username = cleanField(formData, "username");
  const password = cleanField(formData, "password");
  const next = safeNextPath(cleanField(formData, "next"));

  if (!verifyAdminPassword(username, password)) {
    redirect(loginPath(true, next));
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureAdminCookie(),
    path: "/",
    maxAge: getAdminSessionMaxAge()
  });

  redirect(next);
}

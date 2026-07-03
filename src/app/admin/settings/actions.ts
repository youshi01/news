"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import {
  ADMIN_SESSION_COOKIE,
  updateAdminCredentials,
  updateAdminPath,
  verifyAdminSessionValue
} from "@/lib/admin-security";

function cleanField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    redirect(adminHref("/login"));
  }
}

async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function updateCredentialsAction(formData: FormData) {
  await requireAdminSession();

  const result = updateAdminCredentials({
    currentPassword: cleanField(formData, "currentPassword"),
    username: cleanField(formData, "username"),
    newPassword: cleanField(formData, "newPassword")
  });

  if (!result.ok) {
    redirect(adminHref(`/settings?error=${result.error}`));
  }

  await clearAdminSession();
  redirect(adminHref("/login?saved=credentials"));
}

export async function updateAdminPathAction(formData: FormData) {
  await requireAdminSession();

  const result = updateAdminPath({
    currentPassword: cleanField(formData, "currentPassword"),
    adminPath: cleanField(formData, "adminPath")
  });

  if (!result.ok) {
    redirect(adminHref(`/settings?error=${result.error}`));
  }

  await clearAdminSession();
  redirect(`${result.adminPath}/login?saved=path`);
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/admin-security";

export async function requireAdminPageSession() {
  const cookieStore = await cookies();
  const session = verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    redirect(adminHref("/login"));
  }

  return session;
}

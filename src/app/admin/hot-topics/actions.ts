"use server";

import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { importHotNews } from "@/lib/hot-news-importer";

export async function importHotNewsAction() {
  await requireAdminPageSession();

  try {
    await importHotNews();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(
      adminHref(`/hot-topics?import=failed&detail=${encodeURIComponent(message.slice(0, 180))}`)
    );
  }

  redirect(adminHref("/hot-topics?import=done"));
}

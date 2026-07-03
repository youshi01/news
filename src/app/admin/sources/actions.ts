"use server";

import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { importFeeds } from "@/lib/feed-importer";

export async function importFeedsAction() {
  await requireAdminPageSession();

  try {
    await importFeeds();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(
      adminHref(`/sources?import=failed&detail=${encodeURIComponent(message.slice(0, 180))}`)
    );
  }

  redirect(adminHref("/sources?import=done"));
}

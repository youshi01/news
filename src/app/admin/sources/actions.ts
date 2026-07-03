"use server";

import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { execute } from "@/lib/db";
import { importFeeds } from "@/lib/feed-importer";

function cleanText(value: FormDataEntryValue | null, max = 700) {
  return String(value || "").trim().slice(0, max);
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

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

export async function addSourceAction(formData: FormData) {
  await requireAdminPageSession();

  const name = cleanText(formData.get("name"), 190);
  const siteUrl = safeHttpUrl(cleanText(formData.get("siteUrl"), 500));
  const rssUrl = safeHttpUrl(cleanText(formData.get("rssUrl"), 700));
  const defaultLocale = cleanText(formData.get("defaultLocale"), 20) || "en";
  const categorySlug = cleanText(formData.get("categorySlug"), 120) || "technology";
  const interval = Number(cleanText(formData.get("fetchIntervalMinutes"), 10)) || 60;

  if (!name || !siteUrl || !rssUrl) {
    redirect(adminHref("/sources?source=failed&detail=请输入正确的名称、站点地址和 RSS 地址"));
  }

  await execute(
    `
      INSERT INTO sources
        (name, site_url, rss_url, source_type, default_locale, category_slug, enabled, fetch_interval_minutes)
      VALUES (?, ?, ?, 'rss', ?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        site_url = VALUES(site_url),
        default_locale = VALUES(default_locale),
        category_slug = VALUES(category_slug),
        enabled = 1,
        fetch_interval_minutes = VALUES(fetch_interval_minutes),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      name,
      siteUrl,
      rssUrl,
      defaultLocale,
      categorySlug,
      Math.max(5, Math.min(1440, Math.round(interval)))
    ]
  );

  redirect(adminHref("/sources?source=added"));
}

export async function deleteSourceAction(formData: FormData) {
  await requireAdminPageSession();

  const id = Number(cleanText(formData.get("id"), 30));

  if (!Number.isFinite(id) || id <= 0) {
    redirect(adminHref("/sources?source=failed&detail=来源 ID 不正确"));
  }

  await execute("DELETE FROM sources WHERE id = ?", [id]);
  redirect(adminHref("/sources?source=deleted"));
}

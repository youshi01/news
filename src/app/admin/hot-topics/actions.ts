"use server";

import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { execute } from "@/lib/db";
import { importHotNews, importHotTopicById, importManualHotTopic } from "@/lib/hot-news-importer";

const allowedMarkets = new Set(["ID", "VN", "TH", "MY", "PH"]);

function cleanText(value: FormDataEntryValue | null, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function cleanMarket(value: FormDataEntryValue | null) {
  const market = cleanText(value, 10).toUpperCase();
  return allowedMarkets.has(market) ? market : "ID";
}

function cleanHeatScore(value: FormDataEntryValue | null) {
  const score = Number(cleanText(value, 10));

  if (!Number.isFinite(score)) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

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

export async function addHotTopicAction(formData: FormData) {
  await requireAdminPageSession();

  const topic = cleanText(formData.get("topic"));
  const market = cleanMarket(formData.get("market"));
  const approxTraffic = cleanText(formData.get("approxTraffic"), 80) || undefined;
  const heatScore = cleanHeatScore(formData.get("heatScore"));

  if (!topic) {
    redirect(adminHref("/hot-topics?topic=failed&detail=请输入热点词"));
  }

  try {
    await importManualHotTopic({
      topic,
      market,
      approxTraffic,
      heatScore
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(
      adminHref(`/hot-topics?topic=failed&detail=${encodeURIComponent(message.slice(0, 180))}`)
    );
  }

  redirect(adminHref("/hot-topics?topic=added"));
}

export async function importHotTopicNewsAction(formData: FormData) {
  await requireAdminPageSession();

  const id = Number(cleanText(formData.get("id"), 30));

  if (!Number.isFinite(id) || id <= 0) {
    redirect(adminHref("/hot-topics?topic=failed&detail=热点词 ID 不正确"));
  }

  try {
    await importHotTopicById(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(
      adminHref(`/hot-topics?topic=failed&detail=${encodeURIComponent(message.slice(0, 180))}`)
    );
  }

  redirect(adminHref("/hot-topics?topic=imported"));
}

export async function deleteHotTopicAction(formData: FormData) {
  await requireAdminPageSession();

  const id = Number(cleanText(formData.get("id"), 30));

  if (!Number.isFinite(id) || id <= 0) {
    redirect(adminHref("/hot-topics?topic=failed&detail=热点词 ID 不正确"));
  }

  await execute("DELETE FROM hot_topics WHERE id = ?", [id]);
  redirect(adminHref("/hot-topics?topic=deleted"));
}

import crypto from "node:crypto";

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function stripHtml(input = "") {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(input = "", max = 160) {
  if (input.length <= max) {
    return input;
  }

  return `${input.slice(0, max - 1).trim()}...`;
}

export function readingTime(text = "") {
  const words = stripHtml(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

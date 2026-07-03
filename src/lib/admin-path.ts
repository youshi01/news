export function getAdminPath() {
  const raw = process.env.ADMIN_PATH || "/admin";
  const trimmed = raw.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withSlash.replace(/\/+$/, "");

  if (
    !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(normalized) ||
    normalized === "/api" ||
    normalized.startsWith("/api/") ||
    normalized === "/_next" ||
    normalized.startsWith("/_next/")
  ) {
    return "/admin";
  }

  return normalized || "/admin";
}

export function adminHref(path = "") {
  const base = getAdminPath();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanPath === "/") {
    return base;
  }

  return `${base}${cleanPath}`;
}

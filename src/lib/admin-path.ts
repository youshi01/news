import { getCurrentAdminPath } from "@/lib/admin-security";

export function getAdminPath() {
  return getCurrentAdminPath();
}

export function adminHref(path = "") {
  const base = getAdminPath();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanPath === "/") {
    return base;
  }

  return `${base}${cleanPath}`;
}

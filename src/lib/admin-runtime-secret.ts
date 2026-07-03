import { getEnv } from "@/lib/env";

export const ADMIN_RUNTIME_HEADER = "x-admin-runtime-secret";

export function getAdminRuntimeSecret() {
  return getEnv("ADMIN_INTERNAL_TOKEN") ||
    getEnv("INSTALL_TOKEN") ||
    getEnv("ADMIN_PASSWORD") ||
    "ChangeMe_Admin_Runtime_2026";
}

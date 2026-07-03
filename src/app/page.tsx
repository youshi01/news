import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/locales";
import { isInstalled } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default function IndexPage() {
  if (!isInstalled()) {
    redirect("/install");
  }

  redirect(`/${DEFAULT_LOCALE}`);
}

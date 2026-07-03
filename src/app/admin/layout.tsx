import { redirect } from "next/navigation";
import { isInstalled } from "@/lib/runtime-config";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (!isInstalled()) {
    redirect("/install");
  }

  return children;
}

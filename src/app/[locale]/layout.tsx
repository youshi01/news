import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Analytics } from "@/components/Analytics";
import { normalizeLocale } from "@/lib/locales";
import { redirect } from "next/navigation";
import { isInstalled } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if (!isInstalled()) {
    redirect("/install");
  }

  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);

  return (
    <div className="app-shell">
      <Header locale={locale} />
      <Analytics locale={locale} />
      {children}
      <Footer locale={locale} />
    </div>
  );
}

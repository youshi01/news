"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, SUPPORTED_LOCALES } from "@/lib/locales";

type LocaleSwitcherProps = {
  currentLocale: string;
};

export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const rest = SUPPORTED_LOCALES.includes(parts[0]) ? parts.slice(1) : parts;

  return (
    <span className="locale-switcher">
      {SUPPORTED_LOCALES.map((locale) => {
        const href = `/${[locale, ...rest].join("/")}`;

        return (
          <Link
            key={locale}
            href={href}
            className={locale === currentLocale ? "active" : ""}
            title={localeLabels[locale] || locale}
          >
            {locale}
          </Link>
        );
      })}
    </span>
  );
}

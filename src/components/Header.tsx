import { Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type HeaderProps = {
  locale: string;
};

export function Header({ locale }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="topline">
        <Link href={`/${locale}`} className="brand">
          <span className="brand-mark">S</span>
          <span>
            <strong>{siteConfig.name}</strong>
            <small>SEA technology and business signals</small>
          </span>
        </Link>

        <div className="header-actions">
          <Link href={`/${locale}/trending`} className="text-button">
            <TrendingUp size={16} />
            Trending
          </Link>
          <Link href={`/${locale}/search`} className="icon-button" aria-label="Search" title="Search">
            <Search size={18} />
          </Link>
        </div>
      </div>

      <nav className="nav-bar" aria-label="Primary navigation">
        <Link href={`/${locale}`}>Top Stories</Link>
        <Link href={`/${locale}/latest`}>Latest</Link>
        <Link href={`/${locale}/trending`}>Trending</Link>
        <Link href={`/${locale}/category/ai`}>AI</Link>
        <Link href={`/${locale}/category/security`}>Security</Link>
        <Link href={`/${locale}/category/startups`}>Startups</Link>
        <ThemeSwitcher />
        <LocaleSwitcher currentLocale={locale} />
      </nav>
    </header>
  );
}

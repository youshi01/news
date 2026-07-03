import Link from "next/link";
import { siteConfig } from "@/lib/site";

type FooterProps = {
  locale: string;
};

export function Footer({ locale }: FooterProps) {
  return (
    <footer className="site-footer">
      <div>
        <strong>{siteConfig.name}</strong>
        <p>{siteConfig.description}</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href={`/${locale}/about`}>About</Link>
        <Link href={`/${locale}/privacy`}>Privacy</Link>
        <Link href={`/${locale}/editorial-policy`}>Editorial Policy</Link>
      </nav>
    </footer>
  );
}

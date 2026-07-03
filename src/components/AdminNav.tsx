import Link from "next/link";
import { adminHref } from "@/lib/admin-path";

const links = [
  { href: adminHref(), label: "总览" },
  { href: adminHref("/articles"), label: "文章" },
  { href: adminHref("/hot-topics"), label: "热点词" },
  { href: adminHref("/sources"), label: "来源" },
  { href: adminHref("/tasks"), label: "任务" },
  { href: adminHref("/media"), label: "图片" },
  { href: adminHref("/ad-slots"), label: "广告位" },
  { href: adminHref("/settings"), label: "设置" }
];

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="后台导航">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
      <form action="/api/admin/logout" method="post">
        <button type="submit">退出登录</button>
      </form>
    </nav>
  );
}

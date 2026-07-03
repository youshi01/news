import { BarChart3, Clock3, Eye, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { adminHref } from "@/lib/admin-path";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { getAdminStats } from "@/lib/data";
import { importHotNewsAction } from "./hot-topics/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPageSession();
  const stats = await getAdminStats();

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">流量控制台</div>
          <h1>后台总览</h1>
        </div>
        <span className="text-button">最近 7 天</span>
      </div>
      <AdminNav />

      <section className="stats-grid">
        <div className="admin-card">
          <Eye size={22} />
          <span className="stat-number">{stats.pageViews}</span>
          <p>页面浏览次数</p>
        </div>
        <div className="admin-card">
          <BarChart3 size={22} />
          <span className="stat-number">{stats.articleViews}</span>
          <p>文章浏览次数</p>
        </div>
        <div className="admin-card">
          <Clock3 size={22} />
          <span className="stat-number">{stats.avgDurationSeconds}s</span>
          <p>平均浏览时间</p>
        </div>
        <div className="admin-card">
          <MousePointerClick size={22} />
          <span className="stat-number">{stats.clicks}</span>
          <p>点击次数</p>
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-card">
          <h2>热门文章</h2>
          {stats.topArticles.length ? (
            <ul className="data-list">
              {stats.topArticles.map((article) => (
                <li key={`${article.locale}-${article.title}`}>
                  <span>
                    <strong>{article.title}</strong>
                    <br />
                    <small>{article.locale}</small>
                  </span>
                  <span>{article.views} 次浏览 / {article.clicks} 次点击</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>暂时还没有流量。站点开始有人访问后，这里会显示热门文章。</p>
          )}
        </div>

        <div className="admin-card">
          <h2>最近事件</h2>
          {stats.recentEvents.length ? (
            <ul className="data-list">
              {stats.recentEvents.map((event) => (
                <li key={`${event.createdAt}-${event.path}`}>
                  <span>
                    <strong>{event.eventType}</strong>
                    <br />
                    <small>{event.path}</small>
                  </span>
                  <span>{event.locale || "n/a"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>埋点已经准备好，但暂时还没有记录到事件。</p>
          )}
        </div>
      </section>

      <section className="admin-card admin-shortcuts">
        <h2>运营入口</h2>
        <form action={importHotNewsAction}>
          <button className="text-button" type="submit">立即导入热点</button>
        </form>
        <Link className="text-button" href={adminHref("/articles")}>文章管理</Link>
        <Link className="text-button" href={adminHref("/hot-topics")}>热点词</Link>
        <Link className="text-button" href={adminHref("/sources")}>来源管理</Link>
        <Link className="text-button" href={adminHref("/tasks")}>任务记录</Link>
        <Link className="text-button" href={adminHref("/media")}>图片管理</Link>
        <Link className="text-button" href={adminHref("/ad-slots")}>广告位</Link>
        <Link className="text-button" href={adminHref("/settings")}>设置</Link>
      </section>
    </main>
  );
}

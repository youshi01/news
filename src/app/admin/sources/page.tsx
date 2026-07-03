import { AdminNav } from "@/components/AdminNav";
import { localeLabel, sourceTypeLabel } from "@/lib/admin-labels";
import { getAdminSources } from "@/lib/admin-data";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import {
  addSourceAction,
  deleteSourceAction,
  importFeedsAction,
  importSelectedSourcesAction
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage({
  searchParams
}: {
  searchParams: Promise<{ import?: string; source?: string; detail?: string }>;
}) {
  await requireAdminPageSession();
  const importStatus = await searchParams;
  const sources = await getAdminSources(120);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">内容采集</div>
          <h1>来源管理</h1>
        </div>
        <form action={importFeedsAction}>
          <button className="text-button" type="submit">立即导入 RSS 文章</button>
        </form>
      </div>
      <AdminNav />

      {importStatus.import === "done" && (
        <div className="settings-success">
          RSS 文章导入已执行。新文章会自动进入文章列表、首页、sitemap 和 RSS 输出。
        </div>
      )}
      {importStatus.import === "selected" && (
        <div className="settings-success">
          已导入选中的 RSS 来源。
        </div>
      )}
      {importStatus.import === "failed" && (
        <div className="install-error">
          RSS 文章导入失败。
          {importStatus.detail && <small>{importStatus.detail}</small>}
        </div>
      )}
      {importStatus.source === "added" && (
        <div className="settings-success">
          来源已添加。点击“立即导入 RSS 文章”可以马上抓取。
        </div>
      )}
      {importStatus.source === "deleted" && (
        <div className="settings-success">
          来源已删除。已经导入的文章会保留。
        </div>
      )}
      {importStatus.source === "failed" && (
        <div className="install-error">
          来源操作失败。
          {importStatus.detail && <small>{importStatus.detail}</small>}
        </div>
      )}

      <section className="admin-card">
        <h2>新增 RSS 来源</h2>
        <form className="admin-form admin-inline-form source-inline-form" action={addSourceAction}>
          <label>
            名称
            <input name="name" required placeholder="例如 BBC News" />
          </label>
          <label>
            站点地址
            <input name="siteUrl" type="url" required placeholder="https://example.com" />
          </label>
          <label>
            RSS 地址
            <input name="rssUrl" type="url" required placeholder="https://example.com/feed.xml" />
          </label>
          <label>
            语言
            <select name="defaultLocale" defaultValue="en">
              <option value="en">英语</option>
              <option value="id">印尼语</option>
              <option value="vi">越南语</option>
              <option value="th">泰语</option>
              <option value="ms-MY">马来语</option>
              <option value="tl-PH">菲律宾语</option>
              <option value="zh-Hans">简体中文</option>
            </select>
          </label>
          <label>
            分类
            <input name="categorySlug" defaultValue="technology" />
          </label>
          <label>
            间隔分钟
            <input name="fetchIntervalMinutes" type="number" min="5" max="1440" defaultValue="60" />
          </label>
          <button type="submit">添加来源</button>
        </form>
      </section>

      {sources.length ? (
        <section className="admin-card">
          <div className="section-heading">
            <h2>{sources.length} 个来源</h2>
            <span>已启用来源会参与自动采集</span>
          </div>
          <form id="source-bulk-form" className="bulk-actions" action={importSelectedSourcesAction}>
            <button className="text-button" type="submit">导入选中来源</button>
          </form>
          <ul className="data-list admin-table-list selectable-list source-list">
            {sources.map((source) => (
              <li key={source.id}>
                <input
                  aria-label={`选择 ${source.name}`}
                  form="source-bulk-form"
                  name="ids"
                  type="checkbox"
                  value={source.id}
                />
                <span>
                  <strong>{source.name}</strong>
                  <br />
                  <small>
                    {sourceTypeLabel(source.sourceType)} / {localeLabel(source.defaultLocale)} / {source.enabled ? "已启用" : "已停用"}
                  </small>
                  {source.rssUrl && (
                    <>
                      <br />
                      <small>{source.rssUrl}</small>
                    </>
                  )}
                </span>
                <span>
                  {source.lastFetchedAt
                    ? new Intl.DateTimeFormat("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(new Date(source.lastFetchedAt))
                    : "未采集"}
                </span>
                <span>{source.failureCount} 次失败</span>
                <span className="row-actions">
                  <a className="text-button" href={source.siteUrl} target="_blank" rel="noreferrer">
                    访问
                  </a>
                  <form action={deleteSourceAction}>
                    <input type="hidden" name="id" value={source.id} />
                    <button className="text-button danger-button" type="submit">删除</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无来源</h2>
          <p>初始化数据库后会写入默认 RSS 来源。也可以先点击“立即导入 RSS 文章”验证采集链路。</p>
        </div>
      )}
    </main>
  );
}

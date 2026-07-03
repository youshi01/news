import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { localeLabel, marketLabel } from "@/lib/admin-labels";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { getHotTopics } from "@/lib/hot-topics";
import {
  addHotTopicAction,
  deleteHotTopicAction,
  importHotNewsAction,
  importHotTopicNewsAction
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHotTopicsPage({
  searchParams
}: {
  searchParams: Promise<{ import?: string; topic?: string; detail?: string }>;
}) {
  await requireAdminPageSession();
  const importStatus = await searchParams;
  const topics = await getHotTopics(100);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">热点新闻引擎</div>
          <h1>热点词</h1>
        </div>
        <form action={importHotNewsAction}>
          <button className="text-button" type="submit">立即导入热点</button>
        </form>
      </div>
      <AdminNav />

      {importStatus.import === "done" && (
        <div className="settings-success">
          热点导入完成，下面会显示最新数据。
        </div>
      )}
      {importStatus.import === "failed" && (
        <div className="install-error">
          热点导入失败。
          {importStatus.detail && <small>{importStatus.detail}</small>}
        </div>
      )}
      {importStatus.topic === "added" && (
        <div className="settings-success">
          热点词已添加，并已尝试抓取相关新闻。
        </div>
      )}
      {importStatus.topic === "imported" && (
        <div className="settings-success">
          已重新抓取这个热点词的相关新闻。
        </div>
      )}
      {importStatus.topic === "deleted" && (
        <div className="settings-success">
          热点词已删除。已经生成的文章会保留。
        </div>
      )}
      {importStatus.topic === "failed" && (
        <div className="install-error">
          热点词操作失败。
          {importStatus.detail && <small>{importStatus.detail}</small>}
        </div>
      )}

      <section className="admin-card">
        <h2>新增热点词</h2>
        <form className="admin-form admin-inline-form" action={addHotTopicAction}>
          <label>
            热点词
            <input name="topic" required placeholder="例如 OpenAI、Apple、Bitcoin" />
          </label>
          <label>
            市场
            <select name="market" defaultValue="ID">
              <option value="ID">印尼</option>
              <option value="VN">越南</option>
              <option value="TH">泰国</option>
              <option value="MY">马来西亚</option>
              <option value="PH">菲律宾</option>
            </select>
          </label>
          <label>
            预估热度
            <input name="approxTraffic" placeholder="例如 5000+" />
          </label>
          <label>
            热度分
            <input name="heatScore" type="number" min="0" max="100" placeholder="自动" />
          </label>
          <button type="submit">添加并抓取新闻</button>
        </form>
      </section>

      {topics.length ? (
        <section className="admin-card">
          <p>{topics.length} 个热点</p>
          <ul className="data-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <span>
                  <strong>{topic.topic}</strong>
                  <br />
                  <small>
                    {marketLabel(topic.market)} / {localeLabel(topic.locale)} / 热度 {topic.heatScore}
                    {topic.approxTraffic ? ` / ${topic.approxTraffic}` : ""}
                  </small>
                </span>
                {topic.articleSlug ? (
                  <Link className="text-button" href={`/${topic.articleLocale || topic.locale}/news/${topic.articleSlug}`}>
                    打开
                  </Link>
                ) : (
                  <span>未生成页面</span>
                )}
                <span className="row-actions">
                  <form action={importHotTopicNewsAction}>
                    <input type="hidden" name="id" value={topic.id} />
                    <button className="text-button" type="submit">抓取新闻</button>
                  </form>
                  <form action={deleteHotTopicAction}>
                    <input type="hidden" name="id" value={topic.id} />
                    <button className="text-button danger-button" type="submit">删除</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无热点词</h2>
          <p>点击“立即导入热点”，或在容器里执行 docker exec news npm run import:hot-news。</p>
        </div>
      )}
    </main>
  );
}

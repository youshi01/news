import { AdminNav } from "@/components/AdminNav";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">站点控制</div>
          <h1>设置</h1>
        </div>
        <span className="text-button">本地预览</span>
      </div>
      <AdminNav />

      <section className="admin-grid">
        <div className="admin-card">
          <h2>主题</h2>
          <p>选择一个后台/前台预览主题。当前选择会保存在这个浏览器里，后续可以接入 site_settings 做全站默认主题。</p>
          <ThemeSwitcher language="zh" />
          <div className="theme-preview-grid">
            <div className="theme-preview classic-preview">
              <strong>经典</strong>
              <span>传统新闻站排版，暖色纸张背景，标题感强。</span>
            </div>
            <div className="theme-preview midnight-preview">
              <strong>深色</strong>
              <span>适合后台和夜间运营的深色新闻界面。</span>
            </div>
            <div className="theme-preview paper-preview">
              <strong>报纸</strong>
              <span>更简洁的通讯社风格，适合信息密度高的站点。</span>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h2>自动化</h2>
          <p>当前 worker 的主要方向：</p>
          <ul>
            <li>按东南亚市场抓取 Google Trends 热点</li>
            <li>通过 GDELT 发现相关新闻来源</li>
            <li>自动生成 SEO 新闻页面</li>
            <li>广告位先预留，等流量起来后开启</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

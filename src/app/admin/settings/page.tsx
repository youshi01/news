import { AdminNav } from "@/components/AdminNav";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getAdminSecurity } from "@/lib/admin-security";
import { updateAdminPathAction, updateCredentialsAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  password: "当前密码不正确。",
  username: "账号只能包含字母、数字、点、下划线、@ 和短横线，长度 3-80 位。",
  "new-password": "新密码至少需要 8 位。",
  path: "后台路径格式不正确，请使用 /manage-xxxx 这样的路径。"
};

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const security = getAdminSecurity();
  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : "";

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

      {errorMessage && (
        <div className="install-error">
          {errorMessage}
        </div>
      )}

      <section className="admin-grid">
        <div className="admin-card">
          <h2>账号和密码</h2>
          <p>当前账号：<strong>{security.username}</strong></p>
          <form className="admin-form" action={updateCredentialsAction}>
            <label>
              新管理员账号
              <input
                name="username"
                defaultValue={security.username}
                required
                autoComplete="username"
              />
            </label>
            <label>
              新密码
              <input
                name="newPassword"
                type="password"
                minLength={8}
                placeholder="不修改密码可以留空"
                autoComplete="new-password"
              />
            </label>
            <label>
              当前密码
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit">保存账号和密码</button>
          </form>
        </div>

        <div className="admin-card">
          <h2>后台路径</h2>
          <p>当前后台入口：<strong>{security.adminPath}</strong></p>
          <form className="admin-form" action={updateAdminPathAction}>
            <label>
              新后台路径
              <input
                name="adminPath"
                defaultValue={security.adminPath}
                required
                pattern="/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*"
              />
            </label>
            <label>
              当前密码
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit">保存后台路径</button>
          </form>
        </div>
      </section>

      <section className="admin-grid settings-grid">
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

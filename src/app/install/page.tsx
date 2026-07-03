import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { isInstalled } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isInstalled()) {
    redirect(adminHref());
  }

  const { error } = await searchParams;
  const errorMessage =
    error === "token"
      ? "安装口令不正确。"
      : error === "database"
        ? "数据库连接或初始化失败，请检查 MySQL 信息。"
        : error === "input"
          ? "请填写完整并确认数据库名只包含字母、数字和下划线。"
          : "";

  return (
    <main className="install-page">
      <section className="install-card">
        <div className="kicker">首次安装</div>
        <h1>初始化数据库</h1>
        <p>
          系统还没有配置数据库。请填写你的 MySQL 8.4.10 连接信息，安装程序会创建数据库表并保存配置。
        </p>

        {errorMessage && <div className="install-error">{errorMessage}</div>}

        <form className="install-form" action="/api/install" method="post">
          <label>
            安装口令
            <input
              name="installToken"
              type="password"
              placeholder="INSTALL_TOKEN"
              autoComplete="off"
            />
          </label>

          <div className="install-grid">
            <label>
              MySQL 主机
              <input name="host" defaultValue="127.0.0.1" required />
            </label>
            <label>
              端口
              <input name="port" defaultValue="3306" inputMode="numeric" required />
            </label>
          </div>

          <label>
            数据库名
            <input name="database" defaultValue="news_site" required />
          </label>

          <div className="install-grid">
            <label>
              数据库用户
              <input name="user" required autoComplete="username" />
            </label>
            <label>
              数据库密码
              <input name="password" type="password" required autoComplete="current-password" />
            </label>
          </div>

          <label>
            站点地址
            <input name="siteUrl" defaultValue="http://localhost:3000" required />
          </label>

          <button type="submit">开始初始化</button>
        </form>

        <p className="install-note">
          初始化成功后会跳转到后台登录页。上线后请修改默认后台路径和密码。
        </p>
      </section>
    </main>
  );
}

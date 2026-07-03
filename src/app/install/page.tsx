import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { isInstalled } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  if (isInstalled()) {
    redirect(adminHref());
  }

  const { error, detail } = await searchParams;
  const errorMessage =
    error === "token"
      ? "安装口令不正确。如果你没有自定义 INSTALL_TOKEN，可以留空。"
      : error === "database"
        ? "数据库连接或初始化失败，请检查 MySQL 主机、端口、账号密码、数据库名和权限。"
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

        {errorMessage && (
          <div className="install-error">
            {errorMessage}
            {detail && <small>{detail}</small>}
          </div>
        )}

        <form className="install-form" action="/api/install" method="post">
          <label>
            安装口令，可选
            <input
              name="installToken"
              type="password"
              placeholder="只有自定义 INSTALL_TOKEN 时才需要填写"
              autoComplete="off"
            />
          </label>

          <div className="install-grid">
            <label>
              MySQL 主机
              <input name="host" defaultValue="host.docker.internal" required />
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
          默认镜像可以不填安装口令。初始化成功后会跳转到后台登录页。上线后请修改默认后台路径、后台密码和 INSTALL_TOKEN。
        </p>
        <p className="install-note">
          如果 MySQL 在 Docker 宿主机上，优先填写 host.docker.internal。Linux 服务器如果无法解析这个地址，请填写宿主机内网 IP，或用 README 里的 --add-host 参数启动容器。
        </p>
      </section>
    </main>
  );
}

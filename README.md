# Southeast Signal News

多语言热点新闻站，目标是自动发现热点、生成 SEO 新闻页、统计流量，并为后续广告位接入做准备。

## 默认后台

```text
地址：/manage-8f3k2
登录：/manage-8f3k2/login
账号：admin
密码：ChangeMe_2026_admin
```

首次部署后访问首页 `/`，未初始化数据库时会自动进入 `/install`。

默认安装口令：

```text
ChangeMe_Install_2026
```

使用默认安装口令时，安装页面里的“安装口令”可以留空。只有你在 `.env` 里改成自定义 `INSTALL_TOKEN` 后，安装时才必须填写。

上线后请立即修改 `.env`：

```env
ADMIN_PATH=/your-private-admin-path
ADMIN_USER=your_admin
ADMIN_PASSWORD=your_long_random_password
ADMIN_INTERNAL_TOKEN=your_long_internal_token
ADMIN_COOKIE_SECURE=false
INSTALL_TOKEN=your_long_install_token
```

后台登录使用独立登录页和 HttpOnly Cookie，不再使用浏览器 Basic Auth 弹窗。进入后台后可以在“设置”里修改管理员账号、密码和后台路径，配置会保存到 `data/admin.json`。

## Docker 运行

```bash
docker compose up -d
```

如果使用 GitHub Actions 构建的镜像：

```bash
docker pull ghcr.io/youshi01/news:latest
```

直接运行镜像：

```bash
docker run -d \
  --name news \
  -p 3000:3000 \
  --add-host=host.docker.internal:host-gateway \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PATH=/manage-8f3k2 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=ChangeMe_2026_admin \
  -e ADMIN_INTERNAL_TOKEN=ChangeMe_Internal_Admin_2026 \
  -e ADMIN_COOKIE_SECURE=false \
  -e INSTALL_TOKEN=ChangeMe_Install_2026 \
  ghcr.io/youshi01/news:latest
```

启动后访问：

```text
http://服务器IP:3000/
```

第一次访问会进入 `/install` 初始化数据库。初始化完成后后台入口是：

```text
http://服务器IP:3000/manage-8f3k2
```

如果访问 `/install` 看到的是 `{"code":404,"msg":"Not Found"}` 这种 JSON，而不是中文初始化页面，通常说明 3000 端口不是这个新闻站容器在响应。先检查：

```text
http://服务器IP:3000/api/health
```

正常应该返回 `app: "sea-news-hub"` 和 `image: "ghcr.io/youshi01/news"`。

如果 MySQL 在宿主机上，初始化页面的 MySQL 主机建议填写：

```text
host.docker.internal
```

如果你的服务器 Docker 不支持这个名字，请填写宿主机内网 IP，或保留上面 `docker run` 里的：

```bash
--add-host=host.docker.internal:host-gateway
```

安装程序也会自动尝试 Docker 网关地址，例如容器默认网关、`172.17.0.1`、`172.18.0.1`。

`.env` 建议不要给值加引号，特别是 Docker `env_file` 或 `--env-file` 部署时：

```env
ADMIN_PATH=/manage-8f3k2
ADMIN_USER=admin
ADMIN_PASSWORD=ChangeMe_2026_admin
ADMIN_INTERNAL_TOKEN=ChangeMe_Internal_Admin_2026
ADMIN_COOKIE_SECURE=false
INSTALL_TOKEN=ChangeMe_Install_2026
```

本地或直接用 `http://服务器IP:3000` 测试时，`ADMIN_COOKIE_SECURE` 必须保持 `false`，否则浏览器不会保存登录 Cookie。正式 HTTPS 反代上线后可以改成 `true`。

## 本地开发

```bash
npm install
npm run dev
```

## 热点导入

后台可以直接进入“热点词”页面点击“立即导入热点”。

如果使用 Docker 镜像运行，命令要在容器里执行，不要在服务器 `/home` 目录直接运行：

```bash
docker exec news npm run import:hot-news
```

如果使用 `docker compose`：

```bash
docker compose exec web npm run import:hot-news
```

源码开发环境才直接运行：

```bash
npm run import:hot-news
```

worker 容器会自动等待数据库初始化完成，然后开始按计划导入热点。

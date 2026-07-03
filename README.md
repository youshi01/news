# Southeast Signal News

多语言热点新闻站，目标是自动发现热点、生成 SEO 新闻页、统计流量，并为后续广告位接入做准备。

## 默认后台

```text
地址：/manage-8f3k2
账号：admin
密码：ChangeMe_2026_admin
```

首次部署后访问首页 `/`，未初始化数据库时会自动进入 `/install`。

默认安装口令：

```text
ChangeMe_Install_2026
```

上线后请立即修改 `.env`：

```env
ADMIN_PATH="/your-private-admin-path"
ADMIN_USER="your_admin"
ADMIN_PASSWORD="your_long_random_password"
INSTALL_TOKEN="your_long_install_token"
```

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
  -v $(pwd)/data:/app/data \
  -e ADMIN_PATH=/manage-8f3k2 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=ChangeMe_2026_admin \
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

## 本地开发

```bash
npm install
npm run dev
```

## 热点导入

```bash
npm run import:hot-news
```

worker 容器会自动等待数据库初始化完成，然后开始按计划导入热点。

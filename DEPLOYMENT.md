# ReqFlow 服务器部署指导文档

本文档介绍如何将 ReqFlow 部署到自有服务器（Windows / Linux / macOS 均可），并启用用户注册/登录功能。

---

## 一、部署架构

```
┌─────────────┐     HTTP      ┌──────────────────────┐
│  浏览器用户  │ ───────────▶  │  ReqFlow 服务器       │
│  （多人）    │               │  server/index.mjs    │
└─────────────┘               │  ├─ 托管 dist/ 静态页 │
                              │  ├─ /api/auth/* 注册  │
                              │  │   登录（scrypt 哈希）│
                              │  └─ /api/users 账号列表│
                              │  数据：server/data/    │
                              └──────────────────────┘
```

- **服务器零依赖**：`server/index.mjs` 仅使用 Node.js 内置模块（http/fs/crypto），无需 `npm install` 任何包。
- **用户注册/登录**：账号存于 `server/data/users.json`，密码使用 `scrypt` 加盐哈希，明文不落盘。
- **业务数据**：需求/文档/附件等业务数据仍保存在各用户浏览器的 localStorage + IndexedDB 中（每台浏览器独立工作区）。如后续需要多人共享同一份数据，可在本服务器基础上扩展同步 API。

> 前端会自动探测运行模式：访问 `/api/health` 成功 → 服务器模式（注册/登录走服务端）；失败 → 本地模式（账号名单存本机，可直接在需求中作为创建者/跟进者选择）。

---

## 二、环境要求

| 项目 | 要求 |
|------|------|
| Node.js | ≥ 18（推荐 20/22 LTS） |
| 内存 | ≥ 512 MB |
| 磁盘 | ≥ 200 MB |
| 端口 | 默认 4173（可用 `PORT` 环境变量修改） |

验证 Node：`node -v`

---

## 三、快速部署（3 条命令）

在项目根目录执行：

```bash
# 1. 安装前端依赖（首次）
npm install

# 2. 构建前端产物到 dist/
npm run build

# 3. 启动服务器（默认 0.0.0.0:4173）
npm run serve
```

看到以下输出即部署成功：

```
──────────────────────────────────────────────
  ReqFlow 服务器已启动
  ➜ 本机访问   http://localhost:4173
  ➜ 网络访问   http://<服务器IP>:4173
  ➜ 静态目录   .../dist
  ➜ 用户数据   .../server/data/users.json
──────────────────────────────────────────────
```

局域网/互联网用户通过 `http://<服务器IP>:4173` 访问，右上角「未登录」按钮即可注册账号。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `4173` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址（`127.0.0.1` = 仅本机） |
| `REQFLOW_DIST` | `../dist` | 前端产物目录（可指向自定义路径） |

示例：`PORT=80 node server/index.mjs`

---

## 四、用户注册与账号体系

1. 打开 `http://<服务器IP>:4173`，点击右上角 **未登录** 按钮。
2. 切换到「注册新账号」标签，填写用户名（2-32 位）、密码（≥4 位）、可选显示名。
3. 注册成功自动登录，顶栏显示当前账号。
4. 新建需求时：
   - **创建者**默认填充当前登录账号；
   - **跟进者**可从系统内全部注册账号下拉选择，也可为空。
5. 导出的需求文档（Excel/CSV/Markdown/HTML/PDF）自动包含创建者/跟进者字段。

### API 一览（可供运维/集成调用）

```bash
# 健康检查
curl http://localhost:4173/api/health

# 注册
curl -X POST http://localhost:4173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"123456","displayName":"张三"}'

# 登录（返回 7 天有效 token）
curl -X POST http://localhost:4173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"123456"}'

# 账号列表（需 token）
curl http://localhost:4173/api/users -H "Authorization: Bearer <token>"
```

---

## 五、生产环境常驻运行

### Linux（systemd）

创建 `/etc/systemd/system/reqflow.service`：

```ini
[Unit]
Description=ReqFlow Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/reqflow
Environment=PORT=4173
ExecStart=/usr/bin/node server/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now reqflow
sudo systemctl status reqflow     # 查看运行状态
```

### Linux（pm2）

```bash
npm install -g pm2
pm2 start server/index.mjs --name reqflow
pm2 save && pm2 startup
```

### Docker（可选）

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 4173
CMD ["node", "server/index.mjs"]
```

```bash
docker build -t reqflow .
docker run -d -p 4173:4173 -v reqflow-data:/app/server/data --name reqflow reqflow
```

### Nginx 反向代理（可选，用于 80/443 + HTTPS）

```nginx
server {
    listen 80;
    server_name reqflow.example.com;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

HTTPS 建议配合 `certbot` 签发证书。

---

## 六、数据备份与迁移

| 数据 | 位置 | 说明 |
|------|------|------|
| 用户账号 | `server/data/users.json` | 定期备份；迁移时整目录拷贝即可 |
| 前端产物 | `dist/` | 重新 `npm run build` 即可再生 |

备份示例：

```bash
tar czf reqflow-backup-$(date +%F).tar.gz server/data/
```

---

## 七、升级流程

```bash
cd /opt/reqflow
git pull                 # 或覆盖新代码
npm install              # 依赖有更新时
npm run build            # 重新构建前端
sudo systemctl restart reqflow   # 或 pm2 restart reqflow
```

账号数据在升级过程中保留（`server/data/` 与代码分离）。

---

## 八、常见问题

**Q1：访问显示「未找到资源，请先执行 npm run build」？**
说明 `dist/` 不存在，先在项目根目录执行 `npm run build`。

**Q2：注册时报「该用户名已被注册」？**
用户名全局唯一，请换一个；或管理员手动编辑 `server/data/users.json`（编辑前停服）。

**Q3：忘记密码？**
管理员可在 `server/data/users.json` 中删除对应账号条目，让用户重新注册。

**Q4：忘记密码 / token 过期？**
登录 token 有效期 7 天，过期后重新登录即可。

**Q5：如何修改端口？**
启动时加环境变量：`PORT=8080 node server/index.mjs`。

**Q6：需求/文档数据存在哪里？多人是否共享？**
业务数据保存在各用户浏览器（localStorage + IndexedDB），同一浏览器多账号共用一个工作区；不同浏览器/电脑之间不自动同步。

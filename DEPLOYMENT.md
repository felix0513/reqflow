# ReqFlow Server Deployment Guide

This guide explains how to deploy ReqFlow to your own server (Windows / Linux / macOS) and enable user registration/login.

---

## 1. Deployment Architecture

```
┌─────────────┐     HTTP      ┌──────────────────────┐
│  Browser     │ ───────────▶  │  ReqFlow Server      │
│  users       │               │  server/index.mjs    │
│  (multiple)  │               │  ├─ Serves dist/     │
└─────────────┘               │  ├─ /api/auth/*      │
                              │  │  register/login    │
                              │  │  (scrypt hashing)  │
                              │  └─ /api/users        │
                              │  Data: server/data/   │
                              └──────────────────────┘
```

- **Zero-dependency server**: `server/index.mjs` uses only Node.js built-in modules (http/fs/crypto); no `npm install` of any package is required.
- **User registration/login**: accounts are stored in `server/data/users.json`; passwords are scrypt-hashed with salt and never stored in plain text.
- **Business data**: requirements/documents/attachments remain in each user's browser (localStorage + IndexedDB) as per-browser workspaces. To share the same dataset across multiple users later, extend this server with synchronization APIs.

> The frontend auto-detects its mode: a successful request to `/api/health` → server mode (registration/login handled server-side); otherwise → local mode (the account list is stored locally and can be selected as creator/owner).

---

## 2. Requirements

| Item | Requirement |
|------|-------------|
| Node.js | ≥ 18 (20/22 LTS recommended) |
| Memory | ≥ 512 MB |
| Disk | ≥ 200 MB |
| Port | 4173 by default (override via the `PORT` env var) |

Verify Node: `node -v`

---

## 3. Quick Deploy (3 commands)

Run in the project root:

```bash
# 1. Install frontend dependencies (first time)
npm install

# 2. Build the frontend into dist/
npm run build

# 3. Start the server (default 0.0.0.0:4173)
npm run serve
```

You are deployed once you see:

```
──────────────────────────────────────────────
  ReqFlow server started
  ➜ Local      http://localhost:4173
  ➜ Network    http://<server-IP>:4173
  ➜ Static     .../dist
  ➜ Users      .../server/data/users.json
──────────────────────────────────────────────
```

LAN/Internet users access via `http://<server-IP>:4173` and register an account from the "Not logged in" button in the top-right.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4173` | Listening port |
| `HOST` | `0.0.0.0` | Listening address (`127.0.0.1` = local only) |
| `REQFLOW_DIST` | `../dist` | Frontend build directory (can point to a custom path) |

Example: `PORT=80 node server/index.mjs`

---

## 4. User Registration & Accounts

1. Open `http://<server-IP>:4173` and click the **Not logged in** button in the top-right.
2. Switch to the "Register" tab and fill in a username (2-32 chars), a password (≥ 4 chars), and an optional display name.
3. On success you are logged in automatically; the top bar shows the current account.
4. When creating a requirement:
   - **Creator** defaults to the current account;
   - **Owner** can be picked from all registered accounts via dropdown, or left empty.
5. Exported requirement documents (Excel/CSV/Markdown/HTML/PDF) automatically include the creator/owner fields.

### API Reference (for ops/integration)

```bash
# Health check
curl http://localhost:4173/api/health

# Register
curl -X POST http://localhost:4173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"123456","displayName":"Zhang San"}'

# Login (returns a 7-day token)
curl -X POST http://localhost:4173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"123456"}'

# List accounts (requires token)
curl http://localhost:4173/api/users -H "Authorization: Bearer <token>"
```

---

## 5. Production (Keep It Running)

### Linux (systemd)

Create `/etc/systemd/system/reqflow.service`:

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
sudo systemctl status reqflow     # check status
```

### Linux (pm2)

```bash
npm install -g pm2
pm2 start server/index.mjs --name reqflow
pm2 save && pm2 startup
```

### Docker (optional)

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

### Nginx reverse proxy (optional, for 80/443 + HTTPS)

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

For HTTPS, pair it with `certbot` to issue a certificate.

---

## 6. Backup & Migration

| Data | Location | Notes |
|------|----------|-------|
| User accounts | `server/data/users.json` | Back up regularly; copy the whole directory when migrating |
| Frontend build | `dist/` | Regenerated by `npm run build` |

Backup example:

```bash
tar czf reqflow-backup-$(date +%F).tar.gz server/data/
```

---

## 7. Upgrade

```bash
cd /opt/reqflow
git pull                        # or overwrite with new code
npm install                     # when dependencies change
npm run build                   # rebuild the frontend
sudo systemctl restart reqflow  # or pm2 restart reqflow
```

Account data is preserved during upgrades (`server/data/` is kept separate from code).

---

## 8. FAQ

**Q1: I see "Resource not found, run npm run build first"?**
`dist/` does not exist; run `npm run build` in the project root first.

**Q2: Registration says "username already taken"?**
Usernames are globally unique; pick another, or an admin can manually edit `server/data/users.json` (stop the server before editing).

**Q3: Forgot the password?**
An admin can delete the account entry in `server/data/users.json` and let the user re-register.

**Q4: Token expired?**
Login tokens are valid for 7 days; log in again after expiry.

**Q5: How do I change the port?**
Set an environment variable on startup: `PORT=8080 node server/index.mjs`.

**Q6: Where are requirements/documents stored? Are they shared across users?**
Business data lives in each user's browser (localStorage + IndexedDB); multiple accounts on the same browser share one workspace; different browsers/computers do not auto-sync.

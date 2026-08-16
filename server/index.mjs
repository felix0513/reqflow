/**
 * ReqFlow 服务器（零依赖，Node.js >= 18）
 *
 * 功能：
 * 1. 托管前端构建产物（dist/），支持 SPA 路由回退
 * 2. 用户注册 / 登录 API（scrypt 密码哈希，数据存 server/data/users.json）
 * 3. 账号列表 API（供需求"创建者/跟进者"下拉选择）
 *
 * 启动：
 *   npm run build && npm run serve          （默认 http://localhost:4173）
 *   PORT=80 HOST=0.0.0.0 node server/index.mjs
 *
 * API：
 *   GET  /api/health              → { ok: true, server: true }
 *   POST /api/auth/register       → { username, password, displayName? }  → { ok, token }
 *   POST /api/auth/login          → { username, password }                → { ok, token }
 *   GET  /api/users（Bearer token）→ { users: [{ username, displayName, createdAt }] }
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = process.env.REQFLOW_DIST
  ? path.resolve(process.env.REQFLOW_DIST)
  : path.resolve(__dirname, '..', 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 登录态有效期 7 天

// ==================== 用户数据存储 ====================

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return { users: [], sessions: {} };
  }
}

let db = loadDb();
let saveTimer = null;
function saveDb() {
  // 简单防抖持久化
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
  }, 100);
}

// ==================== 密码与令牌 ====================

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function issueToken(username) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { username, expiresAt: Date.now() + TOKEN_TTL_MS };
  // 顺手清理过期会话
  for (const [t, s] of Object.entries(db.sessions)) {
    if (s.expiresAt < Date.now()) delete db.sessions[t];
  }
  saveDb();
  return token;
}

function userFromToken(req) {
  const auth = req.headers['authorization'] ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return null;
  const session = db.sessions[m[1]];
  if (!session || session.expiresAt < Date.now()) return null;
  return db.users.find((u) => u.username === session.username) ?? null;
}

// ==================== 工具函数 ====================

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJsonBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(DIST_DIR, path.normalize(pathname).replace(/^([.][.][/\\])+/, ''));
  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(res, 403, { ok: false, error: '禁止访问' });
    return;
  }
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      // SPA 回退：非 API 路径一律返回 index.html
      filePath = path.join(DIST_DIR, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        sendJson(res, 404, { ok: false, error: '未找到资源，请先执行 npm run build' });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
      });
      res.end(data);
    });
  });
}

// ==================== API 路由 ====================

async function handleApi(req, res, pathname) {
  // 健康检查（前端用于探测服务器模式）
  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, server: true, users: db.users.length });
    return;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim() || undefined;
    if (!/^[a-zA-Z0-9_\-\u4e00-\u9fff]{2,32}$/.test(username)) {
      sendJson(res, 400, { ok: false, error: '用户名需 2-32 位（字母/数字/下划线/中文）' });
      return;
    }
    if (password.length < 4) {
      sendJson(res, 400, { ok: false, error: '密码至少 4 位' });
      return;
    }
    if (db.users.some((u) => u.username === username)) {
      sendJson(res, 409, { ok: false, error: '该用户名已被注册' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const user = {
      username,
      displayName,
      salt,
      hash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    const token = issueToken(username);
    saveDb();
    sendJson(res, 200, {
      ok: true,
      token,
      user: { username, displayName, createdAt: user.createdAt },
    });
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const user = db.users.find((u) => u.username === username);
    if (!user || hashPassword(password, user.salt) !== user.hash) {
      sendJson(res, 401, { ok: false, error: '用户名或密码错误' });
      return;
    }
    const token = issueToken(username);
    saveDb();
    sendJson(res, 200, {
      ok: true,
      token,
      user: { username, displayName: user.displayName, createdAt: user.createdAt },
    });
    return;
  }

  if (pathname === '/api/users' && req.method === 'GET') {
    const user = userFromToken(req);
    if (!user) {
      sendJson(res, 401, { ok: false, error: '未登录或登录已过期' });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      users: db.users.map((u) => ({
        username: u.username,
        displayName: u.displayName,
        createdAt: u.createdAt,
      })),
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: '接口不存在' });
}

// ==================== HTTP 服务器 ====================

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
    } else {
      serveStatic(req, res, pathname === '/' ? '/index.html' : pathname);
    }
  } catch (e) {
    sendJson(res, 500, { ok: false, error: e?.message ?? '服务器内部错误' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('──────────────────────────────────────────────');
  console.log('  ReqFlow 服务器已启动');
  console.log(`  ➜ 本机访问   http://localhost:${PORT}`);
  console.log(`  ➜ 网络访问   http://<服务器IP>:${PORT}`);
  console.log(`  ➜ 静态目录   ${DIST_DIR}`);
  console.log(`  ➜ 用户数据   ${USERS_FILE}`);
  console.log('──────────────────────────────────────────────');
});

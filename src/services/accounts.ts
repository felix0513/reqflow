/**
 * 账号服务
 *
 * 两种运行模式：
 * - 服务器模式：页面由 ReqFlow 服务器（server/index.mjs）托管时，
 *   账号与登录状态持久化在服务端（server/data/users.json）
 * - 本地模式：Electron / 纯前端开发模式下，账号存 localStorage
 *
 * 需求的"创建者/跟进者"下拉选项来源于账号列表。
 */

const ACCOUNTS_KEY = 'reqflow_accounts';
const CURRENT_KEY = 'reqflow_current_account';
const TOKEN_KEY = 'reqflow_token';

/** 账号信息 */
export interface Account {
  username: string;
  displayName?: string;
  createdAt: string;
}

// ==================== 本地账号（localStorage） ====================

/** 读取本地账号列表 */
export function loadLocalAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(list: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

/** 新增本地账号（重名返回 null） */
export function addLocalAccount(username: string): Account | null {
  const name = username.trim();
  if (!name) return null;
  const list = loadLocalAccounts();
  if (list.some((a) => a.username === name)) return null;
  const acc: Account = { username: name, createdAt: new Date().toISOString() };
  saveLocalAccounts([...list, acc]);
  return acc;
}

/** 读取当前登录账号名 */
export function loadCurrentAccount(): string {
  return localStorage.getItem(CURRENT_KEY) ?? '';
}

/** 设置当前登录账号（'' 表示退出） */
export function saveCurrentAccount(username: string) {
  if (username) localStorage.setItem(CURRENT_KEY, username);
  else localStorage.removeItem(CURRENT_KEY);
}

// ==================== 服务器 API（部署模式） ====================

let serverModeCache: boolean | null = null;

/** 探测是否运行在 ReqFlow 服务器部署模式 */
export async function detectServerMode(): Promise<boolean> {
  if (serverModeCache !== null) return serverModeCache;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(timer);
    serverModeCache = res.ok;
  } catch {
    serverModeCache = false;
  }
  return serverModeCache;
}

/** 手动指定服务器 API 地址（可选，默认同源） */
export function setApiBase(base: string) {
  localStorage.setItem('reqflow_api_base', base.replace(/\/$/, ''));
}

function apiBase(): string {
  return (localStorage.getItem('reqflow_api_base') ?? '') + '/api';
}

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

/** 服务器模式：注册账号 */
export async function serverRegister(
  username: string,
  password: string,
  displayName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${apiBase()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    token?: string;
  };
  if (res.ok && data.token) {
    saveToken(data.token);
    saveCurrentAccount(username);
    return { ok: true };
  }
  return { ok: false, error: data.error ?? `注册失败（HTTP ${res.status}）` };
}

/** 服务器模式：登录 */
export async function serverLogin(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    token?: string;
  };
  if (res.ok && data.token) {
    saveToken(data.token);
    saveCurrentAccount(username);
    return { ok: true };
  }
  return { ok: false, error: data.error ?? `登录失败（HTTP ${res.status}）` };
}

/** 服务器模式：拉取账号列表（需登录 token） */
export async function serverUsers(): Promise<Account[]> {
  const token = getStoredToken();
  if (!token) return [];
  try {
    const res = await fetch(`${apiBase()}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { users?: Account[] };
    return data.users ?? [];
  } catch {
    return [];
  }
}

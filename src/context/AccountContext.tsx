import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  type Account,
  addLocalAccount,
  detectServerMode,
  loadCurrentAccount,
  loadLocalAccounts,
  saveCurrentAccount,
  serverLogin,
  serverRegister,
  serverUsers,
} from '@/services/accounts';

/**
 * 账号上下文：管理注册/登录/登出与账号列表
 * - 服务器部署模式：走 /api（账号存服务端）
 * - 本地模式：账号存 localStorage（无密码，仅名单，用于创建者/跟进者选择）
 */
interface AccountContextValue {
  serverMode: boolean;
  accounts: Account[];
  /** 用户名列表（下拉选项用） */
  usernames: string[];
  /** 当前登录账号名（'' = 未登录，需求默认创建者取此值） */
  currentUser: string;
  /** 注册并登录 */
  register: (username: string, password?: string, displayName?: string) => Promise<{ ok: boolean; error?: string }>;
  /** 登录（本地模式 = 切换当前账号） */
  login: (username: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
  /** 登出 */
  logout: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [serverMode, setServerMode] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(() => loadLocalAccounts());
  const [currentUser, setCurrentUser] = useState<string>(() => loadCurrentAccount());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const isServer = await detectServerMode();
      if (cancelled) return;
      setServerMode(isServer);
      if (isServer) {
        const users = await serverUsers();
        if (!cancelled) setAccounts(users);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(
    async (username: string, password?: string, displayName?: string) => {
      const name = username.trim();
      if (!name) return { ok: false, error: '请输入用户名' };
      if (serverMode) {
        if (!password || password.length < 4) {
          return { ok: false, error: '服务器模式请输入至少 4 位密码' };
        }
        const r = await serverRegister(name, password, displayName);
        if (r.ok) {
          const users = await serverUsers();
          setAccounts(users);
          setCurrentUser(name);
        }
        return r;
      }
      const acc = addLocalAccount(name);
      if (!acc) return { ok: false, error: '该账号已存在' };
      setAccounts((prev) => [...prev, acc]);
      saveCurrentAccount(name);
      setCurrentUser(name);
      return { ok: true };
    },
    [serverMode],
  );

  const login = useCallback(
    async (username: string, password?: string) => {
      const name = username.trim();
      if (!name) return { ok: false, error: '请输入用户名' };
      if (serverMode) {
        const r = await serverLogin(name, password ?? '');
        if (r.ok) {
          const users = await serverUsers();
          setAccounts(users);
          setCurrentUser(name);
        }
        return r;
      }
      if (!accounts.some((a) => a.username === name)) {
        return { ok: false, error: '账号不存在，请先注册' };
      }
      saveCurrentAccount(name);
      setCurrentUser(name);
      return { ok: true };
    },
    [serverMode, accounts],
  );

  const logout = useCallback(() => {
    saveCurrentAccount('');
    setCurrentUser('');
  }, []);

  return (
    <AccountContext.Provider
      value={{
        serverMode,
        accounts,
        usernames: accounts.map((a) => a.username),
        currentUser,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccounts must be used within AccountProvider');
  return ctx;
}

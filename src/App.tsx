import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import {
  RequirementsProvider,
  useRequirements,
} from '@/context/RequirementsContext';
import { DocsProvider } from '@/context/DocsContext';
import { AccountProvider } from '@/context/AccountContext';
import { getTheme, resolveSystemMode } from '@/theme';
import { Layout } from '@/components/layout/Layout';

/**
 * 应用内容：在 Provider 内根据主题模式创建 MUI 主题
 * 同步 Tailwind dark class 以支持 Tailwind 暗色样式
 */
function AppContent() {
  const { state } = useRequirements();

  // 跟踪系统主题变化（themeMode === 'system' 时生效）
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() =>
    resolveSystemMode(),
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () =>
      setSystemMode(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const actualMode =
    state.settings.themeMode === 'system'
      ? systemMode
      : state.settings.themeMode;

  const theme = useMemo(() => getTheme(actualMode), [actualMode]);

  // 同步 Tailwind dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', actualMode === 'dark');
  }, [actualMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout />
    </ThemeProvider>
  );
}

/**
 * App 根组件：RequirementsProvider 包裹主题与布局
 */
function App() {
  return (
    <RequirementsProvider>
      <DocsProvider>
        <AccountProvider>
          <AppContent />
        </AccountProvider>
      </DocsProvider>
    </RequirementsProvider>
  );
}

export default App;

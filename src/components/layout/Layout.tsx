import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useRequirements } from '@/context/RequirementsContext';
import { useDocs } from '@/context/DocsContext';
import { resolveSystemMode } from '@/theme';
import { parseReqflowLink } from '@/services/links';
import type { MainView, Doc, FileItem } from '@/types';
import { TopNav } from './TopNav';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { ListView } from '@/components/list/ListView';
import { BoardView } from '@/components/board/BoardView';
import { RequirementDrawer } from '@/components/drawer/RequirementDrawer';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { ProjectManager } from '@/components/project/ProjectManager';
import { DocsView } from '@/components/docs/DocsView';
import { FileViewer, type ViewerTarget } from '@/components/docs/FileViewer';
import { ProjectsStatusDialog } from '@/components/dashboard/ProjectsStatusDialog';

// 文档编辑器懒加载（含体积较大的 Markdown 编辑器）
const DocEditor = lazy(() =>
  import('@/components/docs/DocEditor').then((m) => ({ default: m.DocEditor })),
);

type PreviewTarget = ViewerTarget;

/**
 * 整体布局：顶部导航 + 主区域（Dashboard + Toolbar + 视图） + 抽屉 + 设置 + 项目管理 + 文件预览 + Toast
 */
export function Layout() {
  const { state, dispatch } = useRequirements();
  const { docs, files, createDoc } = useDocs();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [projectsStatusOpen, setProjectsStatusOpen] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  // 解析实际主题模式（system → light/dark）
  const actualMode =
    state.settings.themeMode === 'system'
      ? resolveSystemMode()
      : state.settings.themeMode;

  const handleToggleTheme = () => {
    const next: 'light' | 'dark' = actualMode === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'THEME_SET', payload: next });
  };

  /** 打开预览（文档/文件） */
  const openPreview = (target: PreviewTarget) => setPreview(target);

  /** 附件预览回调 */
  const handlePreviewRef = (
    target: { kind: 'doc'; doc: Doc } | { kind: 'file'; file: FileItem },
  ) => openPreview(target);

  /** 打开上传文件预览（DocsView） */
  const handleOpenFile = (file: FileItem) => openPreview({ kind: 'file', file });

  // 全局拦截 reqflow:// 链接点击（文档预览 / 需求描述 / Markdown 渲染中的内部链接）
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        'a[href^="reqflow://"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const parsed = parseReqflowLink(href);
      if (!parsed) return;
      e.preventDefault();
      e.stopPropagation();
      if (parsed.kind === 'doc') {
        const doc = docs.find((d) => d.id === parsed.id);
        if (doc) openPreview({ kind: 'doc', doc });
      } else {
        const f = files.find((x) => x.id === parsed.id);
        if (f) openPreview({ kind: 'file', file: f });
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [docs, files]);

  return (
    <Box className="flex h-screen flex-col bg-background.default">
      <TopNav
        view={state.view}
        onViewChange={(v: MainView) => {
          dispatch({ type: 'VIEW_SET', payload: v });
          if (v !== 'docs') setActiveDocId(null);
        }}
        keyword={state.filter.keyword}
        onKeywordChange={(kw: string) =>
          dispatch({ type: 'FILTER_SET', payload: { keyword: kw } })
        }
        themeMode={actualMode}
        onToggleTheme={handleToggleTheme}
        onCreate={() => {
          if (state.view === 'docs') {
            // 文档视图下「新建」直接创建文档
            const id = createDoc({ title: `新文档 ${new Date().toLocaleDateString('zh-CN')}` });
            setActiveDocId(id);
          } else {
            dispatch({ type: 'DRAWER_OPEN', payload: { id: null } });
          }
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        projects={state.projects}
        currentProjectId={state.currentProjectId}
        onProjectChange={(id: string) =>
          dispatch({ type: 'PROJECT_SET_CURRENT', payload: id })
        }
        onOpenProjectManager={() => setProjectManagerOpen(true)}
        onOpenProjectsStatus={() => setProjectsStatusOpen(true)}
      />
      <Box
        component="main"
        className="flex-1 overflow-y-auto"
        sx={{ bgcolor: 'background.default' }}
      >
        {state.view === 'docs' ? (
          activeDocId ? (
            (() => {
              const doc = docs.find((d) => d.id === activeDocId);
              return doc ? (
                <Box className="h-full px-4 py-3">
                  <Suspense
                    fallback={
                      <Box className="flex h-full items-center justify-center">
                        <CircularProgress size={32} />
                      </Box>
                    }
                  >
                    <DocEditor doc={doc} onBack={() => setActiveDocId(null)} />
                  </Suspense>
                </Box>
              ) : (
                <Box className="mx-auto max-w-7xl px-4 py-4">
                  <DocsView
                    onOpenDoc={(id) => setActiveDocId(id)}
                    onCreateDoc={() => {
                      const id = createDoc({ title: `新文档 ${new Date().toLocaleDateString('zh-CN')}` });
                      setActiveDocId(id);
                    }}
                    onOpenFile={handleOpenFile}
                  />
                </Box>
              );
            })()
          ) : (
            <Box className="mx-auto max-w-7xl px-4 py-4">
              <DocsView
                onOpenDoc={(id) => setActiveDocId(id)}
                onCreateDoc={() => {
                  const id = createDoc({ title: `新文档 ${new Date().toLocaleDateString('zh-CN')}` });
                  setActiveDocId(id);
                }}
                onOpenFile={handleOpenFile}
              />
            </Box>
          )
        ) : (
          <Box className="mx-auto max-w-7xl px-4 py-4">
            <Dashboard />
            <Toolbar />
            {state.view === 'list' ? <ListView /> : <BoardView />}
          </Box>
        )}
      </Box>

      {/* 需求创建/编辑抽屉 */}
      <RequirementDrawer
        open={state.drawer.open}
        editingId={state.drawer.editingId}
        categories={state.categories}
        onClose={() => dispatch({ type: 'DRAWER_CLOSE' })}
        onPreviewRef={handlePreviewRef}
      />

      {/* 设置弹窗 */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* 项目管理弹窗 */}
      <ProjectManager
        open={projectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
      />

      {/* 所有项目状态仪表盘弹窗 */}
      <ProjectsStatusDialog
        open={projectsStatusOpen}
        onClose={() => setProjectsStatusOpen(false)}
      />

      {/* 文件/文档预览器 */}
      <FileViewer
        open={preview !== null}
        target={preview}
        onClose={() => setPreview(null)}
      />

      {/* 全局 Toast */}
      <Snackbar
        open={state.toast.open}
        autoHideDuration={3000}
        onClose={() => dispatch({ type: 'TOAST_HIDE' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={state.toast.severity}
          variant="filled"
          onClose={() => dispatch({ type: 'TOAST_HIDE' })}
          sx={{ width: '100%' }}
        >
          {state.toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

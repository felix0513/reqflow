const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// —— 本地文档存储目录 ——
// Web 模式用 localStorage；Electron 模式下文档独立存为本地 .md 文件
const DOCS_DIR = () => {
  const dir = path.join(app.getPath('documents'), 'ReqFlowDocs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/** 文件名安全化 */
function safeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名文档';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'ReqFlow - 需求流程管理工具',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 生产环境加载打包后的 index.html
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // 外部链接交给系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// —— IPC：PDF 导出 ——
// 渲染进程传入 HTML，主进程在隐藏窗口渲染后打印为 PDF
ipcMain.handle('reqflow:export-pdf', async (_event, html) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出为 PDF',
      defaultPath: path.join(app.getPath('documents'), `ReqFlow_${Date.now()}.pdf`),
      filters: [{ name: 'PDF 文档', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    });
    printWin.destroy();
    fs.writeFileSync(filePath, pdf);
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// —— IPC：本地文档文件存储 ——
// 文档独立保存为 Documents/ReqFlowDocs/*.md，实现"文档独立放在本地"
ipcMain.handle('reqflow:doc-save', (_event, { id, title, content }) => {
  try {
    const dir = DOCS_DIR();
    const fileName = `${safeName(title)}.md`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, content || '', 'utf-8');
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('reqflow:doc-read', (_event, title) => {
  try {
    const dir = DOCS_DIR();
    const filePath = path.join(dir, `${safeName(title)}.md`);
    if (!fs.existsSync(filePath)) return { ok: false, error: '文件不存在' };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('reqflow:doc-list', () => {
  try {
    const dir = DOCS_DIR();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    return { ok: true, files };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('reqflow:doc-open-in-folder', () => {
  try {
    const dir = DOCS_DIR();
    shell.openPath(dir);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

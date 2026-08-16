const { contextBridge, ipcRenderer } = require('electron');

// 安全桥接：向渲染进程暴露只读的应用信息与白名单 IPC
contextBridge.exposeInMainWorld('reqflow', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  // —— PDF 导出 ——
  exportPdf: (html) => ipcRenderer.invoke('reqflow:export-pdf', html),
  // —— 本地文档存储（Documents/ReqFlowDocs/*.md）——
  docSave: (payload) => ipcRenderer.invoke('reqflow:doc-save', payload),
  docRead: (title) => ipcRenderer.invoke('reqflow:doc-read', title),
  docList: () => ipcRenderer.invoke('reqflow:doc-list'),
  docOpenInFolder: () => ipcRenderer.invoke('reqflow:doc-open-in-folder'),
});

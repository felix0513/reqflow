import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Doc, DocFolder, FileItem } from '@/types';
import { storage } from '@/services/storage';
import { genId } from '@/constants/id';
import { putBlob, delBlob, getBlob } from '@/services/filedb';

/**
 * 文档状态管理（对标飞书云文档）
 * - Markdown 文档：内容存 localStorage
 * - 上传文件（excel/word/pdf/…）：元数据存 localStorage，二进制存 IndexedDB
 * 每个文档/文件都有可复制的 reqflow:// 链接，可粘贴到需求描述或其他文档中做关联
 */

interface DocsContextValue {
  docs: Doc[];
  folders: DocFolder[];
  files: FileItem[];
  /** 新建文档（返回新文档 id） */
  createDoc: (input: Partial<Doc>) => string;
  /** 更新文档 */
  updateDoc: (id: string, patch: Partial<Doc>) => void;
  /** 删除文档 */
  deleteDoc: (id: string) => void;
  /** 新建文件夹 */
  createFolder: (name: string) => string;
  /** 重命名文件夹 */
  renameFolder: (id: string, name: string) => void;
  /** 删除文件夹（文档/文件移入未分类） */
  deleteFolder: (id: string) => void;
  /** 获取单个文档 */
  getDoc: (id: string) => Doc | undefined;
  /** 上传文件（批量），返回上传成功的文件条目 */
  uploadFiles: (
    fileList: FileList | File[],
    folderId?: string | null,
    relativePaths?: string[],
  ) => Promise<FileItem[]>;
  /** 删除上传文件（同时清理 IndexedDB 内容） */
  deleteFile: (id: string) => void;
  /** 获取上传文件二进制内容 */
  getFileBlob: (id: string) => Promise<Blob | null>;
  /** 按扩展名推断存储的文件 */
  getFile: (id: string) => FileItem | undefined;
}

const DocsContext = createContext<DocsContextValue | null>(null);

/** 从文件名提取小写扩展名 */
function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

export function DocsProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Doc[]>(() => storage.loadDocs());
  const [folders, setFolders] = useState<DocFolder[]>(() =>
    storage.loadDocFolders(),
  );
  const [files, setFiles] = useState<FileItem[]>(() => storage.loadFiles());

  // 持久化到 localStorage（Web 模式）
  useEffect(() => {
    storage.saveDocs(docs);
  }, [docs]);

  useEffect(() => {
    storage.saveDocFolders(folders);
  }, [folders]);

  useEffect(() => {
    storage.saveFiles(files);
  }, [files]);

  // Electron 模式：文档变更时同步为本地 .md 文件（独立存放于 Documents/ReqFlowDocs）
  useEffect(() => {
    const win = window as unknown as {
      reqflow?: { docSave?: (p: { id: string; title: string; content: string }) => Promise<{ ok: boolean; filePath?: string; error?: string }> };
    };
    if (!win.reqflow?.docSave) return;
    // 仅同步最近更新的文档，避免全量重写
    const t = setTimeout(() => {
      docs.forEach((d) => {
        win.reqflow?.docSave?.({ id: d.id, title: d.title, content: d.content });
      });
    }, 500);
    return () => clearTimeout(t);
  }, [docs]);

  const createDoc = useCallback((input: Partial<Doc>): string => {
    const now = new Date().toISOString();
    const doc: Doc = {
      id: genId(),
      title: input.title?.trim() || '未命名文档',
      content: input.content ?? '',
      folderId: input.folderId ?? null,
      description: input.description ?? '',
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    setDocs((prev) => [doc, ...prev]);
    return doc.id;
  }, []);

  const updateDoc = useCallback((id: string, patch: Partial<Doc>) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d,
      ),
    );
  }, []);

  const deleteDoc = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const createFolder = useCallback((name: string): string => {
    const now = new Date().toISOString();
    const folder: DocFolder = {
      id: genId(),
      name: name.trim() || '新建文件夹',
      createdAt: now,
      updatedAt: now,
    };
    setFolders((prev) => [...prev, folder]);
    return folder.id;
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, name: name.trim() || f.name, updatedAt: new Date().toISOString() }
          : f,
      ),
    );
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    // 文件夹内文档/文件移入未分类
    setDocs((prev) =>
      prev.map((d) => (d.folderId === id ? { ...d, folderId: null } : d)),
    );
    setFiles((prev) =>
      prev.map((f) => (f.folderId === id ? { ...f, folderId: null } : f)),
    );
  }, []);

  const getDoc = useCallback(
    (id: string) => docs.find((d) => d.id === id),
    [docs],
  );

  const getFile = useCallback(
    (id: string) => files.find((f) => f.id === id),
    [files],
  );

  /** 上传文件：元数据入 localStorage，Blob 入 IndexedDB */
  const uploadFiles = useCallback(
    async (
      fileList: FileList | File[],
      folderId: string | null = null,
      relativePaths?: string[],
    ): Promise<FileItem[]> => {
      const arr = Array.from(fileList as ArrayLike<File>);
      const now = new Date().toISOString();
      const uploaded: FileItem[] = [];

      // 收集需要新建的文件夹（相对路径第一级目录名 → folderId）
      const dirFolderMap = new Map<string, string>();
      if (relativePaths && relativePaths.length === arr.length) {
        for (const rp of relativePaths) {
          const parts = rp.split('/');
          if (parts.length > 1) {
            const dirName = parts[0];
            if (!dirFolderMap.has(dirName)) {
              const fid = genId();
              dirFolderMap.set(dirName, fid);
              setFolders((prev) => [
                ...prev,
                { id: fid, name: dirName, createdAt: now, updatedAt: now },
              ]);
            }
          }
        }
      }

      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const item: FileItem = {
          id: genId(),
          name: file.name,
          ext: extOf(file.name),
          mime: file.type || 'application/octet-stream',
          size: file.size,
          folderId:
            relativePaths && relativePaths[i]
              ? dirFolderMap.get(relativePaths[i].split('/')[0]) ?? folderId
              : folderId,
          createdAt: now,
          updatedAt: now,
        };
        const ok = await putBlob(item.id, file);
        if (!ok) {
          // IndexedDB 不可用（如隐私模式）时跳过该文件
          continue;
        }
        uploaded.push(item);
      }

      if (uploaded.length > 0) {
        setFiles((prev) => [...uploaded, ...prev]);
      }
      return uploaded;
    },
    [],
  );

  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    // 异步清理 IndexedDB 内容
    void delBlob(id);
  }, []);

  const getFileBlob = useCallback(async (id: string) => {
    return getBlob(id);
  }, []);

  const value = useMemo(
    () => ({
      docs,
      folders,
      files,
      createDoc,
      updateDoc,
      deleteDoc,
      createFolder,
      renameFolder,
      deleteFolder,
      getDoc,
      uploadFiles,
      deleteFile,
      getFileBlob,
      getFile,
    }),
    [docs, folders, files, createDoc, updateDoc, deleteDoc, createFolder, renameFolder, deleteFolder, getDoc, uploadFiles, deleteFile, getFileBlob, getFile],
  );

  return <DocsContext.Provider value={value}>{children}</DocsContext.Provider>;
}

export function useDocs(): DocsContextValue {
  const ctx = useContext(DocsContext);
  if (!ctx) throw new Error('useDocs must be used within DocsProvider');
  return ctx;
}

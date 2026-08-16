import type {
  Requirement,
  Category,
  AppSettings,
  Doc,
  DocFolder,
  Project,
  RequirementVersion,
  FileItem,
} from '@/types';
import { DATA_VERSION } from '@/constants/index';
import { INITIAL_VERSION } from '@/services/versioning';

/**
 * StorageService：localStorage 统一 CRUD + 导入导出
 * 所有持久化操作集中于此，UI 层禁止直接操作 localStorage
 */

// localStorage 键名约定
const KEYS = {
  requirements: 'reqflow_requirements',
  categories: 'reqflow_categories',
  settings: 'reqflow_settings',
  version: 'reqflow_version',
  initialized: 'reqflow_initialized',
  docs: 'reqflow_docs',
  docFolders: 'reqflow_doc_folders',
  files: 'reqflow_files',
  projects: 'reqflow_projects',
  currentProjectId: 'reqflow_current_project',
  requirementVersions: 'reqflow_requirement_versions',
} as const;

/** 安全解析 JSON，失败时返回 fallback */
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  /** 加载全部需求 */
  loadRequirements(): Requirement[] {
    return safeParse<Requirement[]>(
      localStorage.getItem(KEYS.requirements),
      [],
    );
  },

  /** 保存全部需求 */
  saveRequirements(reqs: Requirement[]): void {
    localStorage.setItem(KEYS.requirements, JSON.stringify(reqs));
  },

  /** 加载全部分类 */
  loadCategories(): Category[] {
    return safeParse<Category[]>(localStorage.getItem(KEYS.categories), []);
  },

  /** 保存全部分类 */
  saveCategories(cats: Category[]): void {
    localStorage.setItem(KEYS.categories, JSON.stringify(cats));
  },

  /** 加载应用设置 */
  loadSettings(): AppSettings {
    return safeParse<AppSettings>(localStorage.getItem(KEYS.settings), {
      themeMode: 'system',
    });
  },

  /** 保存应用设置 */
  saveSettings(s: AppSettings): void {
    localStorage.setItem(KEYS.settings, JSON.stringify(s));
  },

  /** 加载全部文档 */
  loadDocs(): Doc[] {
    return safeParse<Doc[]>(localStorage.getItem(KEYS.docs), []);
  },

  /** 保存全部文档 */
  saveDocs(docs: Doc[]): void {
    localStorage.setItem(KEYS.docs, JSON.stringify(docs));
  },

  /** 加载全部文档文件夹 */
  loadDocFolders(): DocFolder[] {
    return safeParse<DocFolder[]>(localStorage.getItem(KEYS.docFolders), []);
  },

  /** 保存全部文档文件夹 */
  saveDocFolders(folders: DocFolder[]): void {
    localStorage.setItem(KEYS.docFolders, JSON.stringify(folders));
  },

  // ==================== 上传文件元数据（二进制内容在 IndexedDB） ====================

  /** 加载全部上传文件元数据 */
  loadFiles(): FileItem[] {
    return safeParse<FileItem[]>(localStorage.getItem(KEYS.files), []);
  },

  /** 保存全部上传文件元数据 */
  saveFiles(files: FileItem[]): void {
    localStorage.setItem(KEYS.files, JSON.stringify(files));
  },

  // ==================== 项目管理 ====================

  /** 加载全部项目 */
  loadProjects(): Project[] {
    return safeParse<Project[]>(localStorage.getItem(KEYS.projects), []);
  },

  /** 保存全部项目 */
  saveProjects(projects: Project[]): void {
    localStorage.setItem(KEYS.projects, JSON.stringify(projects));
  },

  /** 加载当前选中的项目 ID */
  loadCurrentProjectId(): string | null {
    return localStorage.getItem(KEYS.currentProjectId);
  },

  /** 保存当前选中的项目 ID */
  saveCurrentProjectId(id: string | null): void {
    if (id) {
      localStorage.setItem(KEYS.currentProjectId, id);
    } else {
      localStorage.removeItem(KEYS.currentProjectId);
    }
  },

  // ==================== 版本记录 ====================

  /** 加载全部版本记录 */
  loadRequirementVersions(): RequirementVersion[] {
    return safeParse<RequirementVersion[]>(
      localStorage.getItem(KEYS.requirementVersions),
      [],
    );
  },

  /** 保存全部版本记录 */
  saveRequirementVersions(versions: RequirementVersion[]): void {
    localStorage.setItem(KEYS.requirementVersions, JSON.stringify(versions));
  },

  // ==================== 数据迁移 ====================

  /**
   * 数据迁移：为旧版需求（无 projectId/version）补充字段
   * 旧数据中所有需求归入默认项目，版本号设为 1.0.0
   */
  migrateRequirements(reqs: Requirement[], defaultProjectId: string): Requirement[] {
    let migrated = false;
    const result = reqs.map((r) => {
      const patch: Partial<Requirement> = {};
      if (!r.projectId) {
        patch.projectId = defaultProjectId;
        migrated = true;
      }
      if (!r.version) {
        patch.version = INITIAL_VERSION;
        migrated = true;
      }
      return Object.keys(patch).length > 0 ? { ...r, ...patch } : r;
    });
    if (migrated) {
      this.saveRequirements(result);
    }
    return result;
  },

  /** 获取数据版本 */
  getVersion(): string | null {
    return localStorage.getItem(KEYS.version);
  },

  /** 写入数据版本 */
  setVersion(): void {
    localStorage.setItem(KEYS.version, DATA_VERSION);
  },

  /** 是否已完成首次初始化（用于避免清空后重新加载种子） */
  loadInitialized(): boolean {
    return localStorage.getItem(KEYS.initialized) === 'true';
  },

  /** 标记已完成首次初始化 */
  setInitialized(): void {
    localStorage.setItem(KEYS.initialized, 'true');
  },

  /**
   * 导出全部数据为 JSON 字符串
   * @returns 格式化的 JSON 字符串
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        version: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        requirements: this.loadRequirements(),
        categories: this.loadCategories(),
        settings: this.loadSettings(),
      },
      null,
      2,
    );
  },

  /**
   * 触发浏览器下载导出文件
   */
  downloadExport(): void {
    const json = this.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reqflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** 清空所有数据 */
  clearAll(): void {
    localStorage.removeItem(KEYS.requirements);
    localStorage.removeItem(KEYS.categories);
    localStorage.removeItem(KEYS.settings);
    localStorage.removeItem(KEYS.version);
    localStorage.removeItem(KEYS.projects);
    localStorage.removeItem(KEYS.currentProjectId);
    localStorage.removeItem(KEYS.requirementVersions);
    localStorage.removeItem(KEYS.files);
  },
};

export type StorageService = typeof storage;

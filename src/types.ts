/**
 * 全局 TypeScript 类型 / 枚举定义
 * 所有跨模块共享的类型集中在此文件
 */

// 优先级（4 级）
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

// 状态（6 态，key 为内部标识）
// review=待评审, todo=待开发, doing=开发中, testing=测试中, done=已完成, closed=已关闭
export type Status = 'review' | 'todo' | 'doing' | 'testing' | 'done' | 'closed';

// 视图模式（需求列表/看板）
export type ViewMode = 'list' | 'board';

// 主视图（含文档库）
export type MainView = 'list' | 'board' | 'docs';

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system';

// 版本变更类型
export type VersionChangeType = 'created' | 'major' | 'minor' | 'patch';

// ==================== 项目 ====================

// 项目工作空间
export interface Project {
  id: string;
  name: string;
  description: string;
  color: string; // hex，如 '#4F46E5'
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// 项目表单输入
export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

// ==================== 附件 ====================

// 附件来源：upload=本地直接上传（存 IndexedDB）；doc=关联文档库文档；file=关联文档库上传文件
export type AttachmentSource = 'upload' | 'doc' | 'file';

// 需求参考文档附件
export interface Attachment {
  id: string; // 内部 ID（upload 来源同时是 IndexedDB blob key）
  name: string; // 文件名
  size: number; // 字节
  mime: string; // MIME 类型
  source: AttachmentSource;
  refId?: string; // doc/file 来源时关联文档库条目 ID
  createdAt: string; // ISO 8601
}

// ==================== 需求 ====================

// 需求原子实体
export interface Requirement {
  id: string; // 内部主键 crypto.randomUUID()
  code: string; // 业务 ID 号，如 'REQ-FEA-00042'（创建后不可变，全局唯一）
  projectId: string; // 关联 Project.id
  title: string; // 必填
  description: string; // 描述文本（支持粘贴 reqflow:// 链接关联文档）
  categoryId: string; // 关联 Category.id
  priority: Priority;
  status: Status;
  tags: string[]; // 标签名数组
  dueDate: string | null; // 'YYYY-MM-DD' 或 null
  order: number; // 同状态内排序权重
  version: string; // 语义化版本号 '1.0.0'
  attachments: Attachment[]; // 参考文档附件
  creator?: string; // 创建者账号名（默认当前登录账户）
  owner?: string; // 跟进者账号名（'' 或 undefined = 未指派）
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// 需求表单输入（不含 id/code/createdAt/updatedAt/order/version/projectId，由系统生成）
export type RequirementInput = Omit<
  Requirement,
  'id' | 'code' | 'createdAt' | 'updatedAt' | 'order' | 'version' | 'projectId' | 'attachments'
> & { attachments?: Attachment[] };

// ==================== 版本记录 ====================

// 单个字段变更记录
export interface FieldChange {
  field: string; // 字段名（中文标签）
  oldValue: string; // 旧值（可读文本）
  newValue: string; // 新值（可读文本）
}

// 需求版本快照（每次变更时记录）
export interface RequirementVersion {
  id: string;
  requirementId: string; // 关联 Requirement.id
  projectId: string; // 关联 Project.id
  version: string; // 版本号 '1.0.0'
  changeType: VersionChangeType; // 变更类型
  changeSummary: string; // 自动生成的变更摘要
  changes: FieldChange[]; // 字段级变更明细
  snapshot: Requirement; // 该版本的完整需求快照
  createdAt: string; // ISO 8601
}

// 分类
export interface Category {
  id: string;
  name: string;
  color: string; // hex，如 '#4F46E5'
}

// 文档文件夹
export interface DocFolder {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// 本地文档（对标飞书云文档，内容为 Markdown）
export interface Doc {
  id: string;
  title: string;
  content: string; // Markdown 内容
  folderId: string | null; // null = 未分类
  description?: string; // 一句话摘要（可选）
  tags?: string[]; // 标签
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// 文档表单输入
export type DocInput = Omit<Doc, 'id' | 'createdAt' | 'updatedAt'>;

// ==================== 上传文件（文档库二进制文件） ====================

// 上传到文档库的本地文件（元数据存 localStorage，二进制内容存 IndexedDB）
export interface FileItem {
  id: string; // 同时是 IndexedDB blob key
  name: string; // 文件名（含扩展名）
  ext: string; // 小写扩展名，如 'pdf'
  mime: string; // MIME 类型
  size: number; // 字节
  folderId: string | null; // 关联 DocFolder.id，null = 未分类
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// 应用设置（持久化）
export interface AppSettings {
  themeMode: ThemeMode;
}

// 筛选状态
export interface FilterState {
  keyword: string;
  categoryIds: string[];
  priorities: Priority[];
  statuses: Status[];
  tags: string[];
  overdueOnly: boolean; // 仅显示逾期需求（未完成且超过截止日期）
}

// 抽屉状态
export interface DrawerState {
  open: boolean;
  editingId: string | null; // null = 新建
}

// Toast 状态
export interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

// 全局状态
export interface AppState {
  requirements: Requirement[];
  categories: Category[];
  projects: Project[];
  currentProjectId: string | null;
  requirementVersions: RequirementVersion[];
  viewingVersionId: string | null; // 当前正在查看的历史版本 ID（null = 查看最新）
  settings: AppSettings;
  filter: FilterState;
  view: MainView;
  selectedIds: string[];
  drawer: DrawerState;
  toast: ToastState;
}

// 排序键
export type SortKey =
  | 'title'
  | 'priority'
  | 'status'
  | 'dueDate'
  | 'updatedAt'
  | 'createdAt';

// Reducer Action 全集
export type Action =
  // —— 需求 CRUD ——
  | { type: 'REQ_CREATE'; payload: Requirement }
  | { type: 'REQ_UPDATE'; payload: { id: string } & Partial<Requirement> }
  | { type: 'REQ_DELETE'; payload: { id: string } }
  | {
      type: 'REQ_BATCH_UPDATE';
      payload: { ids: string[]; patch: Partial<Requirement> };
    }
  | { type: 'REQ_BATCH_DELETE'; payload: { ids: string[] } }
  // —— 看板拖拽 ——
  | { type: 'REQ_MOVE_STATUS'; payload: { id: string; status: Status; order: number } }
  | { type: 'REQ_REORDER'; payload: { status: Status; orderedIds: string[] } }
  // —— 分类 ——
  | { type: 'CATEGORY_UPSERT'; payload: Category }
  | { type: 'CATEGORY_DELETE'; payload: { id: string } }
  // —— 项目管理 ——
  | { type: 'PROJECT_CREATE'; payload: Project }
  | { type: 'PROJECT_UPDATE'; payload: { id: string } & Partial<Project> }
  | { type: 'PROJECT_DELETE'; payload: { id: string } }
  | { type: 'PROJECT_SET_CURRENT'; payload: string }
  // —— 版本管理 ——
  | { type: 'VERSION_ADD'; payload: RequirementVersion }
  | { type: 'VERSION_VIEW_SET'; payload: string | null }
  // —— 筛选/视图/选择 ——
  | { type: 'FILTER_SET'; payload: Partial<FilterState> }
  | { type: 'FILTER_RESET' }
  | { type: 'VIEW_SET'; payload: MainView }
  | { type: 'SELECTION_SET'; payload: string[] }
  // —— 抽屉/主题 ——
  | { type: 'DRAWER_OPEN'; payload: { id?: string | null } }
  | { type: 'DRAWER_CLOSE' }
  | { type: 'THEME_SET'; payload: ThemeMode }
  // —— 数据管理 ——
  | {
      type: 'DATA_IMPORT';
      payload: {
        requirements: Requirement[];
        categories?: Category[];
        mode: 'replace' | 'merge';
      };
    }
  | { type: 'DATA_CLEAR' }
  // —— Toast ——
  | {
      type: 'TOAST_SHOW';
      payload: { message: string; severity?: ToastState['severity'] };
    }
  | { type: 'TOAST_HIDE' };

// 上下文值类型
export interface RequirementsContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  /** 创建需求（自动生成 id/时间戳/排序权重/版本号，并记录初始版本） */
  createRequirement: (input: RequirementInput) => void;
  /** 更新需求（自动版本升级 + 版本记录） */
  updateRequirement: (id: string, patch: Partial<Requirement>) => void;
  /** 创建项目 */
  createProject: (input: ProjectInput) => string;
  /** 更新项目 */
  updateProject: (id: string, patch: Partial<Project>) => void;
  /** 删除项目（同时删除其下所有需求和版本记录） */
  deleteProject: (id: string) => void;
}

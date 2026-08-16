import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
} from 'react';
import type {
  AppState,
  Action,
  Requirement,
  RequirementInput,
  RequirementVersion,
  RequirementsContextValue,
  Project,
  ProjectInput,
} from '@/types';
import { storage } from '@/services/storage';
import { loadCurrentAccount } from '@/services/accounts';
import { DEFAULT_CATEGORIES, createSeedRequirements, DEFAULT_PROJECT } from '@/data/seed';
import { genId } from '@/constants/id';
import { genRequirementCode, migrateRequirementCodes } from '@/services/idgen';
import {
  INITIAL_VERSION,
  createInitialVersionRecord,
  createUpdateVersionRecord,
} from '@/services/versioning';

// 初始状态
const initialState: AppState = {
  requirements: [],
  categories: [],
  projects: [],
  currentProjectId: null,
  requirementVersions: [],
  viewingVersionId: null,
  settings: { themeMode: 'system' },
  filter: {
    keyword: '',
    categoryIds: [],
    priorities: [],
    statuses: [],
    tags: [],
    overdueOnly: false,
  },
  view: 'list',
  selectedIds: [],
  drawer: { open: false, editingId: null },
  toast: { open: false, message: '', severity: 'success' },
};

/**
 * 从 localStorage 初始化状态
 * 首次启动（未初始化）时加载默认项目 + 默认分类 + 种子需求
 * 已初始化则加载存储数据，并执行数据迁移（补充 projectId/version）
 */
function initFromStorage(state: AppState): AppState {
  const categories = storage.loadCategories();
  const requirements = storage.loadRequirements();
  const settings = storage.loadSettings();
  const initialized = storage.loadInitialized();
  const projects = storage.loadProjects();
  const requirementVersions = storage.loadRequirementVersions();
  const currentProjectId = storage.loadCurrentProjectId();

  // 首次启动：未初始化时加载种子数据
  if (!initialized) {
    const seedCats = DEFAULT_CATEGORIES;
    const seedReqs = createSeedRequirements();
    const seedProject = DEFAULT_PROJECT;
    const seedVersions = seedReqs.map((r) => createInitialVersionRecord(r));

    storage.saveCategories(seedCats);
    storage.saveRequirements(seedReqs);
    storage.saveProjects([seedProject]);
    storage.saveCurrentProjectId(seedProject.id);
    storage.saveRequirementVersions(seedVersions);
    storage.setVersion();
    storage.setInitialized();

    return {
      ...state,
      categories: seedCats,
      requirements: seedReqs,
      projects: [seedProject],
      currentProjectId: seedProject.id,
      requirementVersions: seedVersions,
      settings,
    };
  }

  // 已初始化：数据迁移 + 加载存储数据
  let migratedReqs = requirements;
  let migratedProjects = projects;

  // 如果没有项目数据，创建默认项目
  if (migratedProjects.length === 0) {
    const defaultProject: Project = {
      ...DEFAULT_PROJECT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    migratedProjects = [defaultProject];
    storage.saveProjects(migratedProjects);
  }

  // 迁移旧需求（补充 projectId 和 version）
  const defaultPid = migratedProjects[0].id;
  migratedReqs = storage.migrateRequirements(migratedReqs, defaultPid);

  // 迁移业务 ID（补发缺失 code、去重、同步全局计数器）
  migratedReqs = migrateRequirementCodes(migratedReqs, categories);

  // 确定当前项目
  let resolvedCurrentProjectId = currentProjectId;
  if (!resolvedCurrentProjectId || !migratedProjects.some((p) => p.id === resolvedCurrentProjectId)) {
    resolvedCurrentProjectId = migratedProjects[0].id;
    storage.saveCurrentProjectId(resolvedCurrentProjectId);
  }

  return {
    ...state,
    categories,
    requirements: migratedReqs,
    projects: migratedProjects,
    currentProjectId: resolvedCurrentProjectId,
    requirementVersions,
    settings,
  };
}

/**
 * Reducer：纯状态变更
 * updatedAt 在写操作时统一刷新；持久化交由 Provider 副作用
 * 需求更新时自动触发版本升级 + 版本记录
 */
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // —— 需求 CRUD ——
    case 'REQ_CREATE': {
      return {
        ...state,
        requirements: [...state.requirements, action.payload],
      };
    }
    case 'REQ_UPDATE': {
      const { id, ...patch } = action.payload;
      const now = new Date().toISOString();
      const oldReq = state.requirements.find((r) => r.id === id);
      if (!oldReq) return state;

      // 构建更新后的需求对象（用于版本对比）
      const updatedReq: Requirement = { ...oldReq, ...patch, updatedAt: now };

      // 自动版本升级：对比新旧值，生成版本记录
      const versionRecord = createUpdateVersionRecord(oldReq, updatedReq);
      let newVersion = oldReq.version;
      let newVersions = state.requirementVersions;

      if (versionRecord) {
        newVersion = versionRecord.version;
        newVersions = [...state.requirementVersions, versionRecord];
      }

      const finalReq: Requirement = { ...updatedReq, version: newVersion };

      return {
        ...state,
        requirements: state.requirements.map((r) =>
          r.id === id ? finalReq : r,
        ),
        requirementVersions: newVersions,
      };
    }
    case 'REQ_DELETE': {
      const deletedId = action.payload.id;
      return {
        ...state,
        requirements: state.requirements.filter(
          (r) => r.id !== deletedId,
        ),
        requirementVersions: state.requirementVersions.filter(
          (v) => v.requirementId !== deletedId,
        ),
        selectedIds: state.selectedIds.filter(
          (sid) => sid !== deletedId,
        ),
      };
    }
    case 'REQ_BATCH_UPDATE': {
      const { ids, patch } = action.payload;
      const idSet = new Set(ids);
      const now = new Date().toISOString();
      const newVersionRecords: RequirementVersion[] = [];

      const updatedReqs = state.requirements.map((r) => {
        if (!idSet.has(r.id)) return r;
        const updatedReq: Requirement = { ...r, ...patch, updatedAt: now };
        const versionRecord = createUpdateVersionRecord(r, updatedReq);
        if (versionRecord) {
          newVersionRecords.push(versionRecord);
          return { ...updatedReq, version: versionRecord.version };
        }
        return updatedReq;
      });

      return {
        ...state,
        requirements: updatedReqs,
        requirementVersions: [
          ...state.requirementVersions,
          ...newVersionRecords,
        ],
      };
    }
    case 'REQ_BATCH_DELETE': {
      const idSet = new Set(action.payload.ids);
      return {
        ...state,
        requirements: state.requirements.filter((r) => !idSet.has(r.id)),
        requirementVersions: state.requirementVersions.filter(
          (v) => !idSet.has(v.requirementId),
        ),
        selectedIds: [],
      };
    }

    // —— 看板拖拽 ——
    case 'REQ_MOVE_STATUS': {
      const { id, status: newStatus, order: targetIndex } = action.payload;
      const moved = state.requirements.find((r) => r.id === id);
      if (!moved) return state;
      const now = new Date().toISOString();

      // 状态变更触发版本升级
      let newVersion = moved.version;
      let newVersionRecord: RequirementVersion | null = null;
      if (moved.status !== newStatus) {
        const updatedReq: Requirement = {
          ...moved,
          status: newStatus,
          updatedAt: now,
        };
        newVersionRecord = createUpdateVersionRecord(moved, updatedReq);
        if (newVersionRecord) {
          newVersion = newVersionRecord.version;
        }
      }

      // 目标列（排除被移动卡片）按 order 排序
      const targetWithoutMoved = state.requirements
        .filter((r) => r.status === newStatus && r.id !== id)
        .sort((a, b) => a.order - b.order);
      // 插入到目标位置
      const insertAt = Math.max(
        0,
        Math.min(targetIndex, targetWithoutMoved.length),
      );
      targetWithoutMoved.splice(insertAt, 0, moved);
      // 构建目标列 order 映射
      const targetOrderMap = new Map<string, number>();
      targetWithoutMoved.forEach((r, i) => targetOrderMap.set(r.id, i));

      // 源列重新归一化（跨列时）
      const sourceStatus = moved.status;
      const sourceOrderMap = new Map<string, number>();
      if (newStatus !== sourceStatus) {
        const sourceRemaining = state.requirements
          .filter((r) => r.status === sourceStatus && r.id !== id)
          .sort((a, b) => a.order - b.order);
        sourceRemaining.forEach((r, i) => sourceOrderMap.set(r.id, i));
      }

      return {
        ...state,
        requirements: state.requirements.map((r) => {
          if (r.id === id) {
            return {
              ...r,
              status: newStatus,
              order: targetOrderMap.get(id) ?? 0,
              version: newVersion,
              updatedAt: now,
            };
          }
          if (r.status === newStatus && targetOrderMap.has(r.id)) {
            return { ...r, order: targetOrderMap.get(r.id)! };
          }
          if (r.status === sourceStatus && sourceOrderMap.has(r.id)) {
            return { ...r, order: sourceOrderMap.get(r.id)! };
          }
          return r;
        }),
        requirementVersions: newVersionRecord
          ? [...state.requirementVersions, newVersionRecord]
          : state.requirementVersions,
      };
    }
    case 'REQ_REORDER': {
      const { status, orderedIds } = action.payload;
      const orderMap = new Map<string, number>();
      orderedIds.forEach((rid, i) => orderMap.set(rid, i));
      return {
        ...state,
        requirements: state.requirements.map((r) =>
          r.status === status && orderMap.has(r.id)
            ? { ...r, order: orderMap.get(r.id)! }
            : r,
        ),
      };
    }

    // —— 分类 ——
    case 'CATEGORY_UPSERT': {
      const exists = state.categories.some(
        (c) => c.id === action.payload.id,
      );
      return {
        ...state,
        categories: exists
          ? state.categories.map((c) =>
              c.id === action.payload.id ? action.payload : c,
            )
          : [...state.categories, action.payload],
      };
    }
    case 'CATEGORY_DELETE': {
      return {
        ...state,
        categories: state.categories.filter(
          (c) => c.id !== action.payload.id,
        ),
      };
    }

    // —— 项目管理 ——
    case 'PROJECT_CREATE': {
      return {
        ...state,
        projects: [...state.projects, action.payload],
        currentProjectId: action.payload.id, // 新建后自动切换
      };
    }
    case 'PROJECT_UPDATE': {
      const { id, ...patch } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: now } : p,
        ),
      };
    }
    case 'PROJECT_DELETE': {
      const deletedId = action.payload.id;
      const remainingProjects = state.projects.filter(
        (p) => p.id !== deletedId,
      );
      // 删除项目下的所有需求和版本记录
      const remainingReqs = state.requirements.filter(
        (r) => r.projectId !== deletedId,
      );
      const remainingVersions = state.requirementVersions.filter(
        (v) => v.projectId !== deletedId,
      );
      // 如果删除的是当前项目，切换到第一个可用项目
      const newCurrentId =
        state.currentProjectId === deletedId
          ? (remainingProjects[0]?.id ?? null)
          : state.currentProjectId;
      return {
        ...state,
        projects: remainingProjects,
        requirements: remainingReqs,
        requirementVersions: remainingVersions,
        currentProjectId: newCurrentId,
        selectedIds: [],
      };
    }
    case 'PROJECT_SET_CURRENT': {
      return {
        ...state,
        currentProjectId: action.payload,
        selectedIds: [], // 切换项目时清空选择
        viewingVersionId: null,
      };
    }

    // —— 版本管理 ——
    case 'VERSION_ADD': {
      return {
        ...state,
        requirementVersions: [
          ...state.requirementVersions,
          action.payload,
        ],
      };
    }
    case 'VERSION_VIEW_SET': {
      return {
        ...state,
        viewingVersionId: action.payload,
      };
    }

    // —— 筛选/视图/选择 ——
    case 'FILTER_SET': {
      return {
        ...state,
        filter: { ...state.filter, ...action.payload },
      };
    }
    case 'FILTER_RESET': {
      return {
        ...state,
        filter: {
          keyword: '',
          categoryIds: [],
          priorities: [],
          statuses: [],
          tags: [],
          overdueOnly: false,
        },
      };
    }
    case 'VIEW_SET': {
      return { ...state, view: action.payload };
    }
    case 'SELECTION_SET': {
      return { ...state, selectedIds: action.payload };
    }

    // —— 抽屉/主题 ——
    case 'DRAWER_OPEN': {
      return {
        ...state,
        drawer: { open: true, editingId: action.payload.id ?? null },
        viewingVersionId: null, // 打开抽屉时清除版本查看状态
      };
    }
    case 'DRAWER_CLOSE': {
      return {
        ...state,
        drawer: { open: false, editingId: null },
        viewingVersionId: null,
      };
    }
    case 'THEME_SET': {
      return {
        ...state,
        settings: { ...state.settings, themeMode: action.payload },
      };
    }

    // —— 数据管理 ——
    case 'DATA_IMPORT': {
      const { requirements, categories, mode } = action.payload;
      if (mode === 'replace') {
        return {
          ...state,
          requirements,
          categories: categories ?? state.categories,
          selectedIds: [],
        };
      }
      // merge：按 id 合并，已存在则覆盖
      const existingMap = new Map(state.requirements.map((r) => [r.id, r]));
      requirements.forEach((r) => existingMap.set(r.id, r));
      const mergedCats = categories
        ? (() => {
            const catMap = new Map(state.categories.map((c) => [c.id, c]));
            categories.forEach((c) => catMap.set(c.id, c));
            return Array.from(catMap.values());
          })()
        : state.categories;
      return {
        ...state,
        requirements: Array.from(existingMap.values()),
        categories: mergedCats,
        selectedIds: [],
      };
    }
    case 'DATA_CLEAR': {
      return {
        ...state,
        requirements: [],
        requirementVersions: [],
        selectedIds: [],
      };
    }

    // —— Toast ——
    case 'TOAST_SHOW': {
      return {
        ...state,
        toast: {
          open: true,
          message: action.payload.message,
          severity: action.payload.severity ?? 'success',
        },
      };
    }
    case 'TOAST_HIDE': {
      return { ...state, toast: { ...state.toast, open: false } };
    }

    default:
      return state;
  }
}

// Context 创建
const RequirementsContext = createContext<RequirementsContextValue | null>(
  null,
);

/**
 * RequirementsProvider：全局状态 Provider
 * - useReducer 管理状态
 * - useEffect 订阅状态变更自动持久化到 localStorage
 * - 需求更新时自动版本升级 + 版本记录
 * - 暴露便捷方法 createRequirement / updateRequirement / 项目管理
 */
export function RequirementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState, initFromStorage);

  // 副作用：状态变更自动落盘
  useEffect(() => {
    storage.saveRequirements(state.requirements);
  }, [state.requirements]);

  useEffect(() => {
    storage.saveCategories(state.categories);
  }, [state.categories]);

  useEffect(() => {
    storage.saveSettings(state.settings);
  }, [state.settings]);

  useEffect(() => {
    storage.saveProjects(state.projects);
  }, [state.projects]);

  useEffect(() => {
    storage.saveCurrentProjectId(state.currentProjectId);
  }, [state.currentProjectId]);

  useEffect(() => {
    storage.saveRequirementVersions(state.requirementVersions);
  }, [state.requirementVersions]);

  // Toast 自动隐藏
  useEffect(() => {
    if (state.toast.open) {
      const timer = setTimeout(
        () => dispatch({ type: 'TOAST_HIDE' }),
        3000,
      );
      return () => clearTimeout(timer);
    }
  }, [state.toast]);

  // 便捷方法：创建需求（自动生成 id/时间戳/排序权重/版本号，并记录初始版本）
  const createRequirement = useCallback(
    (input: RequirementInput) => {
      const now = new Date().toISOString();
      const projectId = state.currentProjectId ?? state.projects[0]?.id ?? '';
      // 计算同项目同状态内的最大 order + 1
      const maxOrder = state.requirements
        .filter(
          (r) =>
            r.status === input.status && r.projectId === projectId,
        )
        .reduce((max, r) => Math.max(max, r.order), 0);
      const requirement: Requirement = {
        ...input,
        attachments: input.attachments ?? [],
        creator: input.creator ?? loadCurrentAccount(),
        owner: input.owner ?? '',
        id: genId(),
        code: genRequirementCode(input.categoryId, state.categories),
        projectId,
        order: maxOrder + 1,
        version: INITIAL_VERSION,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'REQ_CREATE', payload: requirement });
      // 记录初始版本
      const versionRecord = createInitialVersionRecord(requirement);
      dispatch({ type: 'VERSION_ADD', payload: versionRecord });
    },
    [state.currentProjectId, state.projects, state.requirements, state.categories],
  );

  // 便捷方法：更新需求（reducer 内自动版本升级）
  const updateRequirement = useCallback(
    (id: string, patch: Partial<Requirement>) => {
      dispatch({ type: 'REQ_UPDATE', payload: { id, ...patch } });
    },
    [],
  );

  // 便捷方法：创建项目
  const createProject = useCallback(
    (input: ProjectInput): string => {
      const now = new Date().toISOString();
      const project: Project = {
        ...input,
        id: genId(),
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'PROJECT_CREATE', payload: project });
      return project.id;
    },
    [],
  );

  // 便捷方法：更新项目
  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      dispatch({ type: 'PROJECT_UPDATE', payload: { id, ...patch } });
    },
    [],
  );

  // 便捷方法：删除项目
  const deleteProject = useCallback(
    (id: string) => {
      dispatch({ type: 'PROJECT_DELETE', payload: { id } });
    },
    [],
  );

  const value = useMemo<RequirementsContextValue>(
    () => ({
      state,
      dispatch,
      createRequirement,
      updateRequirement,
      createProject,
      updateProject,
      deleteProject,
    }),
    [
      state,
      createRequirement,
      updateRequirement,
      createProject,
      updateProject,
      deleteProject,
    ],
  );

  return (
    <RequirementsContext.Provider value={value}>
      {children}
    </RequirementsContext.Provider>
  );
}

/**
 * useRequirements：获取全局状态与 dispatch
 */
export function useRequirements(): RequirementsContextValue {
  const ctx = useContext(RequirementsContext);
  if (!ctx) {
    throw new Error('useRequirements 必须在 RequirementsProvider 内使用');
  }
  return ctx;
}

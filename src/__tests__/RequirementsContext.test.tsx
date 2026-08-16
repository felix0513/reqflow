/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

/**
 * RequirementsContext / Reducer 集成测试
 *
 * 由于 reducer 与 initialState 未单独导出，这里通过 renderHook + RequirementsProvider
 * 测试真实装配后的行为（含 initFromStorage 初始化、各 Action、副作用持久化、Toast 自动隐藏）。
 *
 * 通过预先向 localStorage 写入「已初始化 + 指定数据」来获得确定性的初始状态，
 * 从而可对拖拽/排序等依赖 order 的逻辑做精确断言。
 */
import {
  RequirementsProvider,
  useRequirements,
} from '@/context/RequirementsContext';
import type {
  AppState,
  Requirement,
  Category,
  RequirementInput,
} from '@/types';

// ---- 工具：构造需求 ----
let idCounter = 0;
function mkReq(over: Partial<Requirement> = {}): Requirement {
  idCounter += 1;
  const id = over.id ?? `r-${idCounter}`;
  return {
    id,
    projectId: 'project-default',
    code: 'REQ-TST-00001',
    attachments: [],
    title: `需求${id}`,
    description: `描述${id}`,
    categoryId: 'cat-feature',
    priority: 'P2',
    status: 'todo',
    tags: [],
    dueDate: null,
    order: 0,
    version: '1.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const DEFAULT_CATS: Category[] = [
  { id: 'cat-feature', name: '功能', color: '#6366f1' },
  { id: 'cat-bug', name: 'Bug', color: '#ef4444' },
];

/** 将 localStorage 标记为「已初始化」并写入指定数据，使 Provider 加载确定状态 */
function seedLocalStorage(opts: {
  requirements?: Requirement[];
  categories?: Category[];
  settings?: AppState['settings'];
}) {
  localStorage.setItem('reqflow_initialized', 'true');
  localStorage.setItem(
    'reqflow_requirements',
    JSON.stringify(opts.requirements ?? []),
  );
  localStorage.setItem(
    'reqflow_categories',
    JSON.stringify(opts.categories ?? DEFAULT_CATS),
  );
  localStorage.setItem(
    'reqflow_settings',
    JSON.stringify(opts.settings ?? { themeMode: 'system' }),
  );
  // 写入默认项目，确保 initFromStorage 不创建额外项目
  localStorage.setItem(
    'reqflow_projects',
    JSON.stringify([
      {
        id: 'project-default',
        name: '默认项目',
        description: '',
        color: '#4F46E5',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  );
  localStorage.setItem('reqflow_current_project', 'project-default');
  localStorage.setItem('reqflow_requirement_versions', '[]');
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(RequirementsProvider, null, children);

describe('RequirementsContext / Reducer', () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    // 使用假定时器：使 new Date() 确定化，并避免 Toast 3s 自动隐藏计时器意外触发
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============ 初始化逻辑 initFromStorage ============
  describe('初始化（initFromStorage）', () => {
    it('首次启动（未初始化）加载种子数据并标记 initialized', () => {
      const { result } = renderHook(() => useRequirements(), { wrapper });
      expect(result.current.state.requirements).toHaveLength(8);
      expect(result.current.state.categories).toHaveLength(4);
      expect(localStorage.getItem('reqflow_initialized')).toBe('true');
    });

    it('已初始化但无数据时加载空列表（不重新播种）', () => {
      seedLocalStorage({ requirements: [], categories: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      expect(result.current.state.requirements).toEqual([]);
      expect(result.current.state.categories).toEqual([]);
    });

    it('已初始化且有存储数据时加载该数据', () => {
      const reqs = [mkReq({ id: 'a' }), mkReq({ id: 'b' })];
      seedLocalStorage({ requirements: reqs, categories: DEFAULT_CATS });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      expect(result.current.state.requirements).toHaveLength(2);
      expect(result.current.state.requirements[0].id).toBe('a');
    });
  });

  // ============ 需求 CRUD ============
  describe('需求 CRUD', () => {
    it('REQ_CREATE 追加新需求', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      const newReq = mkReq({ id: 'n1', title: '新需求' });
      act(() => {
        result.current.dispatch({ type: 'REQ_CREATE', payload: newReq });
      });
      expect(result.current.state.requirements).toHaveLength(1);
      expect(result.current.state.requirements[0].id).toBe('n1');
    });

    it('REQ_UPDATE 更新指定需求字段并刷新 updatedAt', () => {
      const reqs = [mkReq({ id: 'a', title: '旧标题', status: 'todo' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'REQ_UPDATE',
          payload: { id: 'a', title: '新标题', status: 'doing' },
        });
      });
      const r = result.current.state.requirements.find((x) => x.id === 'a')!;
      expect(r.title).toBe('新标题');
      expect(r.status).toBe('doing');
      // updatedAt 被刷新为当前（假定时器固定时间）
      expect(r.updatedAt).toBe('2026-06-15T12:00:00.000Z');
    });

    it('REQ_UPDATE 不存在的 id 不报错且不影响其它需求', () => {
      const reqs = [mkReq({ id: 'a' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'REQ_UPDATE',
          payload: { id: 'nope', title: 'x' },
        });
      });
      expect(result.current.state.requirements).toHaveLength(1);
    });

    it('REQ_DELETE 移除需求并清理其在 selectedIds 中的引用', () => {
      const reqs = [mkReq({ id: 'a' }), mkReq({ id: 'b' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'SELECTION_SET', payload: ['a', 'b'] });
      });
      act(() => {
        result.current.dispatch({ type: 'REQ_DELETE', payload: { id: 'a' } });
      });
      expect(result.current.state.requirements.map((r) => r.id)).toEqual(['b']);
      expect(result.current.state.selectedIds).toEqual(['b']);
    });
  });

  // ============ 批量操作 ============
  describe('批量操作', () => {
    it('REQ_BATCH_UPDATE 批量更新选中需求的字段', () => {
      const reqs = [
        mkReq({ id: 'a', status: 'todo' }),
        mkReq({ id: 'b', status: 'todo' }),
        mkReq({ id: 'c', status: 'todo' }),
      ];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'REQ_BATCH_UPDATE',
          payload: { ids: ['a', 'c'], patch: { status: 'done', priority: 'P0' } },
        });
      });
      const s = result.current.state.requirements;
      expect(s.find((r) => r.id === 'a')!.status).toBe('done');
      expect(s.find((r) => r.id === 'c')!.status).toBe('done');
      expect(s.find((r) => r.id === 'b')!.status).toBe('todo'); // 未选中不变
    });

    it('REQ_BATCH_DELETE 批量删除并清空 selectedIds', () => {
      const reqs = [mkReq({ id: 'a' }), mkReq({ id: 'b' }), mkReq({ id: 'c' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'SELECTION_SET', payload: ['a', 'b'] });
      });
      act(() => {
        result.current.dispatch({
          type: 'REQ_BATCH_DELETE',
          payload: { ids: ['a', 'b'] },
        });
      });
      expect(result.current.state.requirements.map((r) => r.id)).toEqual(['c']);
      expect(result.current.state.selectedIds).toEqual([]);
    });
  });

  // ============ 看板拖拽 ============
  describe('看板拖拽 REQ_MOVE_STATUS', () => {
    it('跨列拖拽：移动卡片改状态并重排目标列与源列 order', () => {
      // todo: A(0), B(1), C(2) ; doing: X(0), Y(1)
      const reqs = [
        mkReq({ id: 'A', status: 'todo', order: 0 }),
        mkReq({ id: 'B', status: 'todo', order: 1 }),
        mkReq({ id: 'C', status: 'todo', order: 2 }),
        mkReq({ id: 'X', status: 'doing', order: 0 }),
        mkReq({ id: 'Y', status: 'doing', order: 1 }),
      ];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });

      // 把 B 从 todo 拖到 doing 的 index=1
      act(() => {
        result.current.dispatch({
          type: 'REQ_MOVE_STATUS',
          payload: { id: 'B', status: 'doing', order: 1 },
        });
      });

      const s = result.current.state.requirements;
      const byId = (id: string) => s.find((r) => r.id === id)!;
      // B 状态变为 doing
      expect(byId('B').status).toBe('doing');
      // 目标列 doing 顺序：X(0), B(1), Y(2)
      expect(byId('X').order).toBe(0);
      expect(byId('B').order).toBe(1);
      expect(byId('Y').order).toBe(2);
      // 源列 todo 重排：A(0), C(1)
      expect(byId('A').order).toBe(0);
      expect(byId('C').status).toBe('todo');
      expect(byId('C').order).toBe(1);
    });

    it('同列拖拽：仅重排该列 order，不改状态', () => {
      // todo: A(0), B(1), C(2)
      const reqs = [
        mkReq({ id: 'A', status: 'todo', order: 0 }),
        mkReq({ id: 'B', status: 'todo', order: 1 }),
        mkReq({ id: 'C', status: 'todo', order: 2 }),
      ];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });

      // 把 A 移到末尾（index=2）
      act(() => {
        result.current.dispatch({
          type: 'REQ_MOVE_STATUS',
          payload: { id: 'A', status: 'todo', order: 2 },
        });
      });

      const s = result.current.state.requirements;
      const byId = (id: string) => s.find((r) => r.id === id)!;
      expect(byId('A').status).toBe('todo'); // 状态不变
      // 顺序：B(0), C(1), A(2)
      expect(byId('B').order).toBe(0);
      expect(byId('C').order).toBe(1);
      expect(byId('A').order).toBe(2);
    });

    it('拖拽不存在的 id 时状态不变', () => {
      const reqs = [mkReq({ id: 'A', status: 'todo', order: 0 })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      const before = result.current.state.requirements;
      act(() => {
        result.current.dispatch({
          type: 'REQ_MOVE_STATUS',
          payload: { id: 'nope', status: 'doing', order: 0 },
        });
      });
      expect(result.current.state.requirements).toBe(before);
    });
  });

  describe('列内排序 REQ_REORDER', () => {
    it('按给定 orderedIds 重新分配 order', () => {
      const reqs = [
        mkReq({ id: 'A', status: 'todo', order: 0 }),
        mkReq({ id: 'B', status: 'todo', order: 1 }),
        mkReq({ id: 'C', status: 'todo', order: 2 }),
        mkReq({ id: 'X', status: 'doing', order: 0 }),
      ];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'REQ_REORDER',
          payload: { status: 'todo', orderedIds: ['C', 'A', 'B'] },
        });
      });

      const s = result.current.state.requirements;
      const byId = (id: string) => s.find((r) => r.id === id)!;
      expect(byId('C').order).toBe(0);
      expect(byId('A').order).toBe(1);
      expect(byId('B').order).toBe(2);
      // 其它列不受影响
      expect(byId('X').order).toBe(0);
    });
  });

  // ============ 分类 ============
  describe('分类 CATEGORY_UPSERT / CATEGORY_DELETE', () => {
    it('CATEGORY_UPSERT 新增不存在的分类', () => {
      seedLocalStorage({ requirements: [], categories: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'CATEGORY_UPSERT',
          payload: { id: 'c1', name: '新分类', color: '#000000' },
        });
      });
      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0].name).toBe('新分类');
    });

    it('CATEGORY_UPSERT 更新已存在的分类（按 id 覆盖）', () => {
      seedLocalStorage({
        requirements: [],
        categories: [{ id: 'c1', name: '旧', color: '#111111' }],
      });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'CATEGORY_UPSERT',
          payload: { id: 'c1', name: '新', color: '#222222' },
        });
      });
      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0].name).toBe('新');
      expect(result.current.state.categories[0].color).toBe('#222222');
    });

    it('CATEGORY_DELETE 移除指定分类', () => {
      seedLocalStorage({
        requirements: [],
        categories: [
          { id: 'c1', name: 'A', color: '#111111' },
          { id: 'c2', name: 'B', color: '#222222' },
        ],
      });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'CATEGORY_DELETE', payload: { id: 'c1' } });
      });
      expect(result.current.state.categories.map((c) => c.id)).toEqual(['c2']);
    });
  });

  // ============ 筛选/视图/选择 ============
  describe('筛选/视图/选择', () => {
    it('FILTER_SET 合并部分筛选字段', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'FILTER_SET',
          payload: { keyword: '登录', priorities: ['P0'] },
        });
      });
      expect(result.current.state.filter.keyword).toBe('登录');
      expect(result.current.state.filter.priorities).toEqual(['P0']);
      // 未传入字段保持原值
      expect(result.current.state.filter.categoryIds).toEqual([]);
    });

    it('FILTER_RESET 重置全部筛选字段', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'FILTER_SET',
          payload: { keyword: 'x', statuses: ['todo'], tags: ['t'] },
        });
      });
      act(() => {
        result.current.dispatch({ type: 'FILTER_RESET' });
      });
      const f = result.current.state.filter;
      expect(f.keyword).toBe('');
      expect(f.statuses).toEqual([]);
      expect(f.tags).toEqual([]);
      expect(f.priorities).toEqual([]);
      expect(f.categoryIds).toEqual([]);
    });

    it('VIEW_SET 切换视图', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      expect(result.current.state.view).toBe('list');
      act(() => {
        result.current.dispatch({ type: 'VIEW_SET', payload: 'board' });
      });
      expect(result.current.state.view).toBe('board');
    });

    it('SELECTION_SET 设置选中项', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'SELECTION_SET', payload: ['a', 'b'] });
      });
      expect(result.current.state.selectedIds).toEqual(['a', 'b']);
    });
  });

  // ============ 抽屉/主题 ============
  describe('抽屉/主题', () => {
    it('DRAWER_OPEN 无 id 时为新建模式（editingId=null）', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'DRAWER_OPEN', payload: {} });
      });
      expect(result.current.state.drawer).toEqual({ open: true, editingId: null });
    });

    it('DRAWER_OPEN 带 id 时为编辑模式', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'DRAWER_OPEN', payload: { id: 'a' } });
      });
      expect(result.current.state.drawer).toEqual({ open: true, editingId: 'a' });
    });

    it('DRAWER_CLOSE 关闭并清空 editingId', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'DRAWER_OPEN', payload: { id: 'a' } });
      });
      act(() => {
        result.current.dispatch({ type: 'DRAWER_CLOSE' });
      });
      expect(result.current.state.drawer).toEqual({ open: false, editingId: null });
    });

    it('THEME_SET 设置主题', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'THEME_SET', payload: 'dark' });
      });
      expect(result.current.state.settings.themeMode).toBe('dark');
    });
  });

  // ============ 数据导入导出 ============
  describe('DATA_IMPORT', () => {
    it('replace 模式：用导入数据替换全部需求并清空选中项', () => {
      const reqs = [mkReq({ id: 'a' }), mkReq({ id: 'b' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'SELECTION_SET', payload: ['a'] });
      });
      act(() => {
        result.current.dispatch({
          type: 'DATA_IMPORT',
          payload: {
            requirements: [mkReq({ id: 'c' }), mkReq({ id: 'd' })],
            mode: 'replace',
          },
        });
      });
      expect(result.current.state.requirements.map((r) => r.id).sort()).toEqual(['c', 'd']);
      expect(result.current.state.selectedIds).toEqual([]);
    });

    it('replace 模式：传入 categories 时替换分类', () => {
      seedLocalStorage({ requirements: [], categories: DEFAULT_CATS });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'DATA_IMPORT',
          payload: {
            requirements: [],
            categories: [{ id: 'cx', name: '导入分类', color: '#123456' }],
            mode: 'replace',
          },
        });
      });
      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0].id).toBe('cx');
    });

    it('replace 模式：未传入 categories 时保留现有分类', () => {
      seedLocalStorage({ requirements: [], categories: DEFAULT_CATS });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'DATA_IMPORT',
          payload: { requirements: [], mode: 'replace' },
        });
      });
      expect(result.current.state.categories).toHaveLength(DEFAULT_CATS.length);
    });

    it('merge 模式：按 id 合并，已存在则覆盖、新 id 则追加', () => {
      const reqs = [mkReq({ id: '1', title: 'A' }), mkReq({ id: '2', title: 'B' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'DATA_IMPORT',
          payload: {
            requirements: [
              mkReq({ id: '2', title: 'B-新' }),
              mkReq({ id: '3', title: 'C' }),
            ],
            mode: 'merge',
          },
        });
      });
      const map = new Map(result.current.state.requirements.map((r) => [r.id, r.title]));
      expect(map.get('1')).toBe('A'); // 原有保留
      expect(map.get('2')).toBe('B-新'); // 覆盖
      expect(map.get('3')).toBe('C'); // 新增
      expect(result.current.state.requirements).toHaveLength(3);
    });

    it('merge 模式：传入 categories 时按 id 合并分类', () => {
      seedLocalStorage({
        requirements: [],
        categories: [{ id: 'c1', name: '旧', color: '#111111' }],
      });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'DATA_IMPORT',
          payload: {
            requirements: [],
            categories: [
              { id: 'c1', name: '新', color: '#222222' },
              { id: 'c2', name: '新增', color: '#333333' },
            ],
            mode: 'merge',
          },
        });
      });
      const map = new Map(result.current.state.categories.map((c) => [c.id, c.name]));
      expect(map.get('c1')).toBe('新');
      expect(map.get('c2')).toBe('新增');
    });
  });

  describe('DATA_CLEAR', () => {
    it('清空所有需求并清空选中项，但保留分类', () => {
      const reqs = [mkReq({ id: 'a' }), mkReq({ id: 'b' })];
      seedLocalStorage({ requirements: reqs, categories: DEFAULT_CATS });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'SELECTION_SET', payload: ['a'] });
      });
      act(() => {
        result.current.dispatch({ type: 'DATA_CLEAR' });
      });
      expect(result.current.state.requirements).toEqual([]);
      expect(result.current.state.selectedIds).toEqual([]);
      // 分类保留
      expect(result.current.state.categories).toHaveLength(DEFAULT_CATS.length);
    });
  });

  // ============ Toast ============
  describe('Toast', () => {
    it('TOAST_SHOW 显示消息，severity 缺省为 success', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'TOAST_SHOW',
          payload: { message: '操作成功' },
        });
      });
      expect(result.current.state.toast).toEqual({
        open: true,
        message: '操作成功',
        severity: 'success',
      });
    });

    it('TOAST_SHOW 可指定 severity', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'TOAST_SHOW',
          payload: { message: '出错了', severity: 'error' },
        });
      });
      expect(result.current.state.toast.severity).toBe('error');
    });

    it('TOAST_HIDE 设置 open=false', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'TOAST_SHOW',
          payload: { message: 'hi' },
        });
      });
      act(() => {
        result.current.dispatch({ type: 'TOAST_HIDE' });
      });
      expect(result.current.state.toast.open).toBe(false);
    });

    it('Toast 显示 3 秒后自动隐藏', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'TOAST_SHOW',
          payload: { message: '会自动消失' },
        });
      });
      expect(result.current.state.toast.open).toBe(true);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.state.toast.open).toBe(false);
    });
  });

  // ============ 便捷方法 ============
  describe('便捷方法 createRequirement / updateRequirement', () => {
    it('createRequirement 自动生成 id/时间戳/order 并派发 REQ_CREATE', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      const input: RequirementInput = {
        title: '通过 helper 创建',
        description: '',
        categoryId: 'cat-feature',
        priority: 'P1',
        status: 'todo',
        tags: ['新'],
        dueDate: null,
      };
      act(() => {
        result.current.createRequirement(input);
      });
      const reqs = result.current.state.requirements;
      expect(reqs).toHaveLength(1);
      expect(reqs[0].title).toBe('通过 helper 创建');
      expect(reqs[0].id).toBeTruthy();
      expect(reqs[0].createdAt).toBe('2026-06-15T12:00:00.000Z');
      // 空状态新建，order = maxOrder(0) + 1 = 1
      expect(reqs[0].order).toBe(1);
    });

    it('createRequirement 在已有同状态需求时 order 取最大 +1', () => {
      const reqs = [mkReq({ id: 'a', status: 'todo', order: 0 })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.createRequirement({
          title: '第二条',
          description: '',
          categoryId: 'cat-feature',
          priority: 'P2',
          status: 'todo',
          tags: [],
          dueDate: null,
        });
      });
      const created = result.current.state.requirements.find(
        (r) => r.title === '第二条',
      )!;
      expect(created.order).toBe(1);
    });

    it('updateRequirement 派发 REQ_UPDATE', () => {
      const reqs = [mkReq({ id: 'a', title: '旧' })];
      seedLocalStorage({ requirements: reqs });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.updateRequirement('a', { title: '新' });
      });
      expect(
        result.current.state.requirements.find((r) => r.id === 'a')!.title,
      ).toBe('新');
    });
  });

  // ============ 副作用：持久化 ============
  describe('持久化副作用', () => {
    it('需求变更自动写入 localStorage', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'REQ_CREATE',
          payload: mkReq({ id: 'persist-1', title: '持久化测试' }),
        });
      });
      const stored = JSON.parse(
        localStorage.getItem('reqflow_requirements') || '[]',
      ) as Requirement[];
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('persist-1');
    });

    it('分类变更自动写入 localStorage', () => {
      seedLocalStorage({ requirements: [], categories: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: 'CATEGORY_UPSERT',
          payload: { id: 'cp', name: '持久分类', color: '#abcdef' },
        });
      });
      const stored = JSON.parse(
        localStorage.getItem('reqflow_categories') || '[]',
      ) as Category[];
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('cp');
    });

    it('主题变更自动写入 localStorage', () => {
      seedLocalStorage({ requirements: [] });
      const { result } = renderHook(() => useRequirements(), { wrapper });
      act(() => {
        result.current.dispatch({ type: 'THEME_SET', payload: 'dark' });
      });
      const stored = JSON.parse(
        localStorage.getItem('reqflow_settings') || '{}',
      );
      expect(stored.themeMode).toBe('dark');
    });
  });

  // ============ 边界：Provider 外使用 ============
  describe('useRequirements 边界', () => {
    it('在 Provider 外调用抛出错误', () => {
      // 抑制 React 的控制台错误日志
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useRequirements())).toThrow(
        /必须在 RequirementsProvider/,
      );
      spy.mockRestore();
    });
  });
});

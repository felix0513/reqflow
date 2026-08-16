import { describe, it, expect } from 'vitest';
/**
 * 筛选 / 排序纯函数测试
 * 覆盖 applyFilter（维度内 OR / 维度间 AND / 关键词）、sortRequirements、collectAllTags
 */
import {
  applyFilter,
  sortRequirements,
  collectAllTags,
} from '@/constants/filter';
import { PRIORITY_META, STATUS_ORDER } from '@/constants/index';
import type { Requirement, FilterState } from '@/types';

function makeReq(over: Partial<Requirement> = {}): Requirement {
  return {
    id: 'r-' + Math.random().toString(36).slice(2, 8),
    projectId: 'project-default',
    code: 'REQ-TST-00001',
    attachments: [],
    title: '需求标题',
    description: '需求描述',
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

const emptyFilter: FilterState = {
  keyword: '',
  categoryIds: [],
  priorities: [],
  statuses: [],
  tags: [],
  overdueOnly: false,
};

describe('applyFilter', () => {
  it('空筛选条件返回全部需求', () => {
    const reqs = [makeReq(), makeReq()];
    expect(applyFilter(reqs, emptyFilter)).toHaveLength(2);
  });

  it('逾期筛选 overdueOnly=true 仅返回未完成且超过截止日期的需求', () => {
    const past = new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10);
    const reqs = [
      makeReq({ id: 'od', dueDate: past }), // 逾期未完成
      makeReq({ id: 'ok', dueDate: past, status: 'done' }), // 逾期但已完成
      makeReq({ id: 'no-due' }), // 无截止日期
    ];
    expect(applyFilter(reqs, { ...emptyFilter, overdueOnly: true }).map((r) => r.id)).toEqual(['od']);
  });

  describe('关键词搜索（匹配标题/描述/标签，大小写不敏感）', () => {
    const reqs = [
      makeReq({ id: 'a', title: '用户登录', description: '账号密码', tags: [] }),
      makeReq({ id: 'b', title: '导出PDF', description: '格式校验', tags: [] }),
      makeReq({ id: 'c', title: '其他', description: '其他描述', tags: ['安全'] }),
    ];

    it('匹配标题中的关键词', () => {
      expect(applyFilter(reqs, { ...emptyFilter, keyword: '登录' }).map((r) => r.id)).toEqual(['a']);
    });

    it('匹配描述中的关键词', () => {
      expect(applyFilter(reqs, { ...emptyFilter, keyword: '账号' }).map((r) => r.id)).toEqual(['a']);
    });

    it('匹配标签中的关键词', () => {
      expect(applyFilter(reqs, { ...emptyFilter, keyword: '安全' }).map((r) => r.id)).toEqual(['c']);
    });

    it('关键词大小写不敏感', () => {
      const r = [
        makeReq({ id: 'x', title: 'Login Page', description: '' }),
      ];
      expect(applyFilter(r, { ...emptyFilter, keyword: 'LOGIN' }).map((x) => x.id)).toEqual(['x']);
    });

    it('空白关键词不生效（视为无关键词筛选）', () => {
      const r = [makeReq({ id: 'x', title: 'abc' })];
      expect(applyFilter(r, { ...emptyFilter, keyword: '   ' })).toHaveLength(1);
    });

    it('无任何匹配时返回空数组', () => {
      expect(applyFilter(reqs, { ...emptyFilter, keyword: 'zzz不存在' })).toEqual([]);
    });
  });

  describe('分类筛选（维度内 OR）', () => {
    const reqs = [
      makeReq({ id: '1', categoryId: 'cat-a' }),
      makeReq({ id: '2', categoryId: 'cat-b' }),
      makeReq({ id: '3', categoryId: 'cat-c' }),
    ];

    it('单选分类只返回该分类', () => {
      expect(applyFilter(reqs, { ...emptyFilter, categoryIds: ['cat-b'] }).map((r) => r.id)).toEqual(['2']);
    });

    it('多选分类返回任一匹配（OR）', () => {
      expect(
        applyFilter(reqs, { ...emptyFilter, categoryIds: ['cat-a', 'cat-c'] }).map((r) => r.id).sort(),
      ).toEqual(['1', '3']);
    });
  });

  describe('优先级筛选（维度内 OR）', () => {
    const reqs = [
      makeReq({ id: '1', priority: 'P0' }),
      makeReq({ id: '2', priority: 'P1' }),
      makeReq({ id: '3', priority: 'P2' }),
      makeReq({ id: '4', priority: 'P3' }),
    ];

    it('多选优先级返回任一匹配', () => {
      const ids = applyFilter(reqs, { ...emptyFilter, priorities: ['P0', 'P2'] }).map((r) => r.id).sort();
      expect(ids).toEqual(['1', '3']);
    });
  });

  describe('状态筛选（维度内 OR）', () => {
    const reqs = [
      makeReq({ id: '1', status: 'todo' }),
      makeReq({ id: '2', status: 'doing' }),
      makeReq({ id: '3', status: 'done' }),
    ];

    it('多选状态返回任一匹配', () => {
      const ids = applyFilter(reqs, { ...emptyFilter, statuses: ['todo', 'done'] }).map((r) => r.id).sort();
      expect(ids).toEqual(['1', '3']);
    });
  });

  describe('标签筛选（当前实现：AND，需包含全部选中标签）', () => {
    const reqs = [
      makeReq({ id: '1', tags: ['前端', '安全'] }),
      makeReq({ id: '2', tags: ['前端'] }),
      makeReq({ id: '3', tags: ['安全', '性能'] }),
    ];

    it('选中单个标签返回包含该标签的全部', () => {
      const ids = applyFilter(reqs, { ...emptyFilter, tags: ['前端'] }).map((r) => r.id).sort();
      expect(ids).toEqual(['1', '2']);
    });

    it('选中多个标签（AND）只返回同时包含全部的', () => {
      const ids = applyFilter(reqs, { ...emptyFilter, tags: ['前端', '安全'] }).map((r) => r.id).sort();
      expect(ids).toEqual(['1']);
    });
  });

  describe('维度间 AND（多维度组合）', () => {
    const reqs = [
      makeReq({ id: '1', categoryId: 'cat-a', priority: 'P0', status: 'todo', tags: ['前端'] }),
      makeReq({ id: '2', categoryId: 'cat-a', priority: 'P1', status: 'todo', tags: ['前端'] }),
      makeReq({ id: '3', categoryId: 'cat-b', priority: 'P0', status: 'todo', tags: ['前端'] }),
      makeReq({ id: '4', categoryId: 'cat-a', priority: 'P0', status: 'done', tags: ['前端'] }),
    ];

    it('分类+优先级+状态三者同时满足', () => {
      const ids = applyFilter(reqs, {
        ...emptyFilter,
        categoryIds: ['cat-a'],
        priorities: ['P0'],
        statuses: ['todo'],
      }).map((r) => r.id);
      expect(ids).toEqual(['1']);
    });

    it('组合关键词与维度筛选', () => {
      const local = [
        makeReq({ id: '1', title: '登录', categoryId: 'cat-a', priority: 'P0' }),
        makeReq({ id: '2', title: '登录', categoryId: 'cat-b', priority: 'P0' }),
        makeReq({ id: '3', title: '导出', categoryId: 'cat-a', priority: 'P0' }),
      ];
      const ids = applyFilter(local, {
        ...emptyFilter,
        keyword: '登录',
        categoryIds: ['cat-a'],
      }).map((r) => r.id);
      expect(ids).toEqual(['1']);
    });
  });

  it('不修改原始数组', () => {
    const reqs = [makeReq(), makeReq()];
    const snapshot = [...reqs];
    applyFilter(reqs, { ...emptyFilter, keyword: 'zzz' });
    expect(reqs).toEqual(snapshot);
  });
});

describe('sortRequirements', () => {
  const reqs: Requirement[] = [
    makeReq({ id: '1', title: '香蕉', priority: 'P3', status: 'closed', dueDate: '2026-03-01', updatedAt: '2026-01-03T00:00:00.000Z', createdAt: '2026-01-03T00:00:00.000Z' }),
    makeReq({ id: '2', title: '苹果', priority: 'P0', status: 'todo', dueDate: '2026-01-01', updatedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' }),
    makeReq({ id: '3', title: '葡萄', priority: 'P1', status: 'doing', dueDate: null, updatedAt: '2026-01-02T00:00:00.000Z', createdAt: '2026-01-02T00:00:00.000Z' }),
  ];

  it('不修改原数组', () => {
    const snapshot = [...reqs];
    sortRequirements(reqs, 'title', 'asc');
    expect(reqs).toEqual(snapshot);
  });

  it('按标题升序（中文 localeCompare）', () => {
    const ids = sortRequirements(reqs, 'title', 'asc').map((r) => r.id);
    expect(ids).toEqual(['2', '3', '1']); // 苹果 葡萄 香蕉
  });

  it('按优先级：asc 时 P0 在前（权重大的在前为正向）', () => {
    const ids = sortRequirements(reqs, 'priority', 'asc').map((r) => r.id);
    expect(ids).toEqual(['2', '3', '1']); // P0,P1,P3
  });

  it('按优先级 desc 时 P3 在前', () => {
    const ids = sortRequirements(reqs, 'priority', 'desc').map((r) => r.id);
    expect(ids).toEqual(['1', '3', '2']);
  });

  it('按状态 asc 按 STATUS_ORDER 顺序', () => {
    const ids = sortRequirements(reqs, 'status', 'asc').map((r) => r.id);
    const expected = [...reqs]
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
      .map((r) => r.id);
    expect(ids).toEqual(expected);
  });

  it('按截止日期：无截止日期排到最后', () => {
    const ids = sortRequirements(reqs, 'dueDate', 'asc').map((r) => r.id);
    expect(ids).toEqual(['2', '1', '3']); // 01-01, 03-01, null
  });

  it('按 updatedAt 升序', () => {
    const ids = sortRequirements(reqs, 'updatedAt', 'asc').map((r) => r.id);
    expect(ids).toEqual(['2', '3', '1']);
  });

  it('按 createdAt 升序', () => {
    const ids = sortRequirements(reqs, 'createdAt', 'asc').map((r) => r.id);
    expect(ids).toEqual(['2', '3', '1']);
  });
});

describe('collectAllTags', () => {
  it('收集全部标签并去重', () => {
    const reqs = [
      makeReq({ tags: ['前端', '安全'] }),
      makeReq({ tags: ['前端', '性能'] }),
    ];
    // collectAllTags 按 localeCompare('zh-CN') 排序（拼音序）：安全(ān) < 前端(qián) < 性能(xìng)
    expect(collectAllTags(reqs)).toEqual(['安全', '前端', '性能']);
  });

  it('空数组返回空数组', () => {
    expect(collectAllTags([])).toEqual([]);
  });

  it('需求无标签时返回空数组', () => {
    expect(collectAllTags([makeReq(), makeReq()])).toEqual([]);
  });

  it('不修改原数组', () => {
    const reqs = [makeReq({ tags: ['b', 'a'] })];
    const snapshot = reqs.map((r) => ({ ...r, tags: [...r.tags] }));
    collectAllTags(reqs);
    expect(reqs).toEqual(snapshot);
  });
});

describe('常量与筛选一致性', () => {
  it('PRIORITY_META 权重满足 P0>P1>P2>P3', () => {
    expect(PRIORITY_META.P0.weight).toBeGreaterThan(PRIORITY_META.P1.weight);
    expect(PRIORITY_META.P1.weight).toBeGreaterThan(PRIORITY_META.P2.weight);
    expect(PRIORITY_META.P2.weight).toBeGreaterThan(PRIORITY_META.P3.weight);
  });

  it('STATUS_ORDER 覆盖全部 6 个状态且无重复', () => {
    expect(STATUS_ORDER).toHaveLength(6);
    expect(new Set(STATUS_ORDER).size).toBe(6);
  });
});

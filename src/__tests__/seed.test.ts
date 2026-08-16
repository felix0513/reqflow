import { describe, it, expect } from 'vitest';
/**
 * 种子数据测试：默认分类 + 示例需求格式正确性
 */
import {
  DEFAULT_CATEGORIES,
  createSeedRequirements,
} from '@/data/seed';
import {
  PRIORITY_META,
  STATUS_META,
  STATUS_ORDER,
} from '@/constants/index';
import type { Priority, Status, Requirement, Category } from '@/types';

const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];
const VALID_STATUSES: Status[] = STATUS_ORDER;

function isValidId(id: string): boolean {
  // crypto.randomUUID() 形如 8-4-4-4-12，或回退方案 id-...
  return typeof id === 'string' && id.length > 0;
}

describe('DEFAULT_CATEGORIES', () => {
  it('包含 4 个默认分类', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(4);
  });

  it('每个分类字段完整（id/name/color）且 id 唯一', () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(DEFAULT_CATEGORIES.length);
    DEFAULT_CATEGORIES.forEach((c: Category) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('包含约定固定 ID（cat-feature/cat-bug/cat-optimization/cat-other）', () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('cat-feature');
    expect(ids).toContain('cat-bug');
    expect(ids).toContain('cat-optimization');
    expect(ids).toContain('cat-other');
  });
});

describe('createSeedRequirements', () => {
  const reqs = createSeedRequirements();

  it('生成 8 条种子需求', () => {
    expect(reqs).toHaveLength(8);
  });

  it('每条需求字段完整且类型正确', () => {
    reqs.forEach((r: Requirement) => {
      expect(isValidId(r.id)).toBe(true);
      expect(typeof r.title).toBe('string');
      expect(r.title.length).toBeGreaterThan(0);
      expect(typeof r.description).toBe('string');
      expect(typeof r.categoryId).toBe('string');
      expect(VALID_PRIORITIES).toContain(r.priority);
      expect(VALID_STATUSES).toContain(r.status);
      expect(Array.isArray(r.tags)).toBe(true);
      // dueDate 为 'YYYY-MM-DD' 或 null
      expect(r.dueDate === null || /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate)).toBe(true);
      expect(typeof r.order).toBe('number');
      expect(/^\d{4}-\d{2}-\d{2}T/.test(r.createdAt)).toBe(true);
      expect(/^\d{4}-\d{2}-\d{2}T/.test(r.updatedAt)).toBe(true);
    });
  });

  it('每条需求的 categoryId 都引用存在的默认分类', () => {
    const catIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    reqs.forEach((r) => {
      expect(catIds.has(r.categoryId)).toBe(true);
    });
  });

  it('每条需求 id 唯一', () => {
    const ids = reqs.map((r) => r.id);
    expect(new Set(ids).size).toBe(reqs.length);
  });

  it('覆盖多种状态（至少出现 review/todo/doing/testing/done/closed 中多数）', () => {
    const statuses = new Set(reqs.map((r) => r.status));
    // 8 条种子应至少覆盖 5 种以上状态
    expect(statuses.size).toBeGreaterThanOrEqual(5);
  });

  it('覆盖多种优先级（至少出现 P0/P1/P2/P3 中 3 种以上）', () => {
    const pris = new Set(reqs.map((r) => r.priority));
    expect(pris.size).toBeGreaterThanOrEqual(3);
  });

  it('createdAt 不晚于 updatedAt（时间逻辑合理）', () => {
    reqs.forEach((r) => {
      expect(r.createdAt <= r.updatedAt).toBe(true);
    });
  });

  it('两次调用生成不同的 id（非静态缓存）', () => {
    const a = createSeedRequirements();
    const b = createSeedRequirements();
    expect(a[0].id).not.toBe(b[0].id);
  });

  it('优先级/状态值与常量元数据一致', () => {
    reqs.forEach((r) => {
      expect(PRIORITY_META[r.priority]).toBeDefined();
      expect(STATUS_META[r.status]).toBeDefined();
    });
  });
});

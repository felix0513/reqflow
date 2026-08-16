import { describe, it, expect } from 'vitest';
/**
 * 常量一致性测试：优先级/状态元数据、顺序、数据版本
 */
import {
  PRIORITY_META,
  PRIORITY_LIST,
  STATUS_META,
  STATUS_ORDER,
  STATUS_LIST,
  DATA_VERSION,
} from '@/constants/index';
import type { Priority, Status } from '@/types';

describe('优先级常量', () => {
  it('PRIORITY_META 覆盖 P0-P3 四级', () => {
    const keys = Object.keys(PRIORITY_META);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(expect.arrayContaining(['P0', 'P1', 'P2', 'P3']));
  });

  it('每级元数据字段完整且 key 与 Priority 类型一致', () => {
    (['P0', 'P1', 'P2', 'P3'] as Priority[]).forEach((p) => {
      const meta = PRIORITY_META[p];
      expect(meta.key).toBe(p);
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof meta.weight).toBe('number');
    });
  });

  it('PRIORITY_LIST 按权重降序排列', () => {
    const weights = PRIORITY_LIST.map((p) => p.weight);
    const sorted = [...weights].sort((a, b) => b - a);
    expect(weights).toEqual(sorted);
  });

  it('权重唯一且 P0 最大', () => {
    const weights = PRIORITY_LIST.map((p) => p.weight);
    expect(new Set(weights).size).toBe(weights.length);
    expect(PRIORITY_META.P0.weight).toBe(Math.max(...weights));
  });
});

describe('状态常量', () => {
  it('STATUS_META 覆盖 6 个状态', () => {
    expect(Object.keys(STATUS_META)).toHaveLength(6);
    (['review', 'todo', 'doing', 'testing', 'done', 'closed'] as Status[]).forEach((s) => {
      expect(STATUS_META[s]).toBeDefined();
      expect(STATUS_META[s].key).toBe(s);
      expect(STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(STATUS_META[s].color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('STATUS_ORDER 含 6 个状态且无重复', () => {
    expect(STATUS_ORDER).toHaveLength(6);
    expect(new Set(STATUS_ORDER).size).toBe(6);
    (['review', 'todo', 'doing', 'testing', 'done', 'closed'] as Status[]).forEach((s) => {
      expect(STATUS_ORDER).toContain(s);
    });
  });

  it('STATUS_LIST 与 STATUS_ORDER 顺序一致', () => {
    expect(STATUS_LIST.map((s) => s.key)).toEqual(STATUS_ORDER);
  });
});

describe('DATA_VERSION', () => {
  it('版本号为语义化版本字符串', () => {
    expect(DATA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

import { describe, it, expect } from 'vitest';
/**
 * ID 生成 + 日期格式化工具测试
 */
import { genId } from '@/constants/id';
import {
  formatDateTime,
  formatDate,
  todayStr,
  isOverdue,
  getOverdueDays,
  getDueDateLabel,
} from '@/constants/format';
import type { Requirement } from '@/types';

describe('genId', () => {
  it('返回非空字符串', () => {
    expect(genId().length).toBeGreaterThan(0);
  });

  it('多次调用生成不同 id', () => {
    const ids = new Set(Array.from({ length: 50 }, () => genId()));
    expect(ids.size).toBe(50);
  });
});

describe('日期格式化', () => {
  it('formatDateTime 格式为 YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime('2026-01-02T03:04:05.000Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('formatDateTime 空字符串返回 -', () => {
    expect(formatDateTime('')).toBe('-');
  });

  it('formatDate 格式为 YYYY-MM-DD', () => {
    expect(formatDate('2026-01-02')).toBe('2026-01-02');
  });

  it('formatDate null 返回 -', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('todayStr 格式为 YYYY-MM-DD', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isOverdue', () => {
  const base = (over: Partial<Requirement>): Requirement => ({
    id: 'r',
    projectId: 'project-default',
    code: 'REQ-TST-00001',
    attachments: [],
    title: 't',
    description: '',
    categoryId: 'c',
    priority: 'P2',
    status: 'todo',
    tags: [],
    dueDate: null,
    order: 0,
    version: '1.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  it('无截止日期不算逾期', () => {
    expect(isOverdue(base({ dueDate: null }))).toBe(false);
  });

  it('done/closed 状态即使过期也不算逾期', () => {
    expect(isOverdue(base({ status: 'done', dueDate: '2020-01-01' }))).toBe(false);
    expect(isOverdue(base({ status: 'closed', dueDate: '2020-01-01' }))).toBe(false);
  });

  it('截止日期为未来不算逾期', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(isOverdue(base({ dueDate: future.toISOString().slice(0, 10) }))).toBe(false);
  });

  it('截止日期为过去且未完成算逾期', () => {
    expect(isOverdue(base({ status: 'todo', dueDate: '2020-01-01' }))).toBe(true);
  });
});

describe('getOverdueDays', () => {
  it('未逾期返回 0', () => {
    expect(getOverdueDays({} as Requirement)).toBe(0); // dueDate undefined -> isOverdue false
  });

  it('已逾期返回正数天数', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const req = {
      id: 'r',
      projectId: 'project-default',
    code: 'REQ-TST-00001',
    attachments: [],
      title: 't',
      description: '',
      categoryId: 'c',
      priority: 'P2',
      status: 'todo',
      tags: [],
      dueDate: past.toISOString().slice(0, 10),
      order: 0,
      version: '1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as Requirement;
    expect(getOverdueDays(req)).toBeGreaterThanOrEqual(10);
  });
});

describe('getDueDateLabel', () => {
  it('无截止日期返回提示', () => {
    const req = { dueDate: null, status: 'todo' } as Requirement;
    expect(getDueDateLabel(req)).toBe('无截止日期');
  });

  it('done 状态返回格式化日期', () => {
    const req = { dueDate: '2026-01-02', status: 'done' } as Requirement;
    expect(getDueDateLabel(req)).toBe('2026-01-02');
  });
});

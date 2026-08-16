import type { Priority, Status } from '@/types';

/**
 * 常量定义：优先级/状态元数据（中文名 + 色值）
 * 颜色单一来源，theme.ts、Chip 组件、图表统一引用，禁止硬编码颜色
 */

// 优先级元数据
export interface PriorityMeta {
  key: Priority;
  label: string; // 中文标签
  color: string; // hex 色值
  weight: number; // 数字权重，便于排序（P0 最大）
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  P0: { key: 'P0', label: '紧急', color: '#ef4444', weight: 4 },
  P1: { key: 'P1', label: '高', color: '#f97316', weight: 3 },
  P2: { key: 'P2', label: '中', color: '#3b82f6', weight: 2 },
  P3: { key: 'P3', label: '低', color: '#6b7280', weight: 1 },
};

// 优先级列表（按权重降序）
export const PRIORITY_LIST: PriorityMeta[] = [
  PRIORITY_META.P0,
  PRIORITY_META.P1,
  PRIORITY_META.P2,
  PRIORITY_META.P3,
];

// 状态元数据
export interface StatusMeta {
  key: Status;
  label: string; // 中文标签
  color: string; // hex 色值
}

export const STATUS_META: Record<Status, StatusMeta> = {
  review: { key: 'review', label: '待评审', color: '#64748b' },
  todo: { key: 'todo', label: '待开发', color: '#3b82f6' },
  doing: { key: 'doing', label: '开发中', color: '#6366f1' },
  testing: { key: 'testing', label: '测试中', color: '#f59e0b' },
  done: { key: 'done', label: '已完成', color: '#22c55e' },
  closed: { key: 'closed', label: '已关闭', color: '#94a3b8' },
};

// 状态顺序（看板列顺序 + 默认排序）
export const STATUS_ORDER: Status[] = [
  'review',
  'todo',
  'doing',
  'testing',
  'done',
  'closed',
];

// 状态列表（按顺序）
export const STATUS_LIST: StatusMeta[] = STATUS_ORDER.map(
  (key) => STATUS_META[key],
);

// 数据 schema 版本（便于未来迁移）
export const DATA_VERSION = '1.0.0';

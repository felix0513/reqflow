import dayjs from 'dayjs';
import type { Requirement } from '@/types';

/**
 * 日期格式化与逾期判断工具
 * 内部存储 createdAt/updatedAt 为 ISO 8601；dueDate 为 'YYYY-MM-DD'
 */

/** 格式化 ISO 日期为展示格式 'YYYY-MM-DD HH:mm' */
export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
}

/** 格式化日期为 'YYYY-MM-DD' */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD');
}

/** 获取今天的 'YYYY-MM-DD'（用于日期输入默认值） */
export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** 判断需求是否逾期（未完成且超过 dueDate） */
export function isOverdue(req: Requirement): boolean {
  if (!req.dueDate) return false;
  // done/closed 状态不算逾期
  if (req.status === 'done' || req.status === 'closed') return false;
  const due = dayjs(req.dueDate);
  const today = dayjs().startOf('day');
  return due.isBefore(today);
}

/** 计算逾期天数（正数表示已逾期天数，0 表示未逾期） */
export function getOverdueDays(req: Requirement): number {
  if (!isOverdue(req)) return 0;
  const due = dayjs(req.dueDate);
  const today = dayjs().startOf('day');
  return today.diff(due, 'day');
}

/** 获取截止日期的友好描述 */
export function getDueDateLabel(req: Requirement): string {
  if (!req.dueDate) return '无截止日期';
  const due = dayjs(req.dueDate);
  const today = dayjs().startOf('day');
  const diff = due.diff(today, 'day');
  if (req.status === 'done' || req.status === 'closed') {
    return formatDate(req.dueDate);
  }
  if (diff < 0) return `已逾期 ${Math.abs(diff)} 天`;
  if (diff === 0) return '今天截止';
  if (diff === 1) return '明天截止';
  if (diff <= 7) return `${diff} 天后截止`;
  return formatDate(req.dueDate);
}

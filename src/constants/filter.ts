import type { Requirement, FilterState, SortKey } from '@/types';
import { PRIORITY_META, STATUS_ORDER } from '@/constants/index';
import { isOverdue } from '@/constants/format';

/**
 * 纯函数：筛选 + 排序逻辑
 * 无副作用，便于测试与派生计算
 */

/**
 * 应用筛选条件（AND 逻辑：所有条件同时满足）
 * @param reqs 原始需求列表
 * @param filter 筛选状态
 * @returns 符合条件的需求列表
 */
export function applyFilter(
  reqs: Requirement[],
  filter: FilterState,
): Requirement[] {
  return reqs.filter((req) => {
    // 关键词搜索：匹配标题 + 描述 + 标签
    if (filter.keyword.trim()) {
      const kw = filter.keyword.trim().toLowerCase();
      const inTitle = req.title.toLowerCase().includes(kw);
      const inDesc = req.description.toLowerCase().includes(kw);
      const inTags = req.tags.some((t) => t.toLowerCase().includes(kw));
      if (!inTitle && !inDesc && !inTags) return false;
    }
    // 分类筛选（OR：任一选中分类）
    if (
      filter.categoryIds.length > 0 &&
      !filter.categoryIds.includes(req.categoryId)
    ) {
      return false;
    }
    // 优先级筛选（OR）
    if (
      filter.priorities.length > 0 &&
      !filter.priorities.includes(req.priority)
    ) {
      return false;
    }
    // 状态筛选（OR）
    if (
      filter.statuses.length > 0 &&
      !filter.statuses.includes(req.status)
    ) {
      return false;
    }
    // 逾期筛选（仅显示未完成且超过截止日期的需求）
    if (filter.overdueOnly && !isOverdue(req)) {
      return false;
    }
    // 标签筛选（AND：需包含所有选中标签）
    if (
      filter.tags.length > 0 &&
      !filter.tags.every((t) => req.tags.includes(t))
    ) {
      return false;
    }
    return true;
  });
}

/**
 * 排序需求列表
 * @param reqs 需求列表
 * @param key 排序键
 * @param dir 排序方向
 * @returns 排序后的新数组（不修改原数组）
 */
export function sortRequirements(
  reqs: Requirement[],
  key: SortKey,
  dir: 'asc' | 'desc',
): Requirement[] {
  const sorted = [...reqs];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'title':
        cmp = a.title.localeCompare(b.title, 'zh-CN');
        break;
      case 'priority':
        // 优先级按权重降序为默认正向（P0 在前）
        cmp = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
        break;
      case 'status':
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        break;
      case 'dueDate':
        // 无截止日期的排到最后
        cmp = (a.dueDate || '9999-12-31').localeCompare(
          b.dueDate || '9999-12-31',
        );
        break;
      case 'updatedAt':
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
      default:
        cmp = 0;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/**
 * 收集所有标签（去重并排序）
 */
export function collectAllTags(reqs: Requirement[]): string[] {
  const set = new Set<string>();
  reqs.forEach((r) => r.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

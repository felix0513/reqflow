import { useMemo } from 'react';
import { useRequirements } from '@/context/RequirementsContext';
import { applyFilter, sortRequirements } from '@/constants/filter';
import type { SortKey } from '@/types';

/**
 * useFilteredRequirements：派生「当前项目」+ 筛选 + 排序后的需求列表
 * - 自动按 currentProjectId 过滤需求
 * - 无参数时仅返回筛选结果（供看板等视图使用）
 * - 传入 sortKey/sortDir 时返回筛选 + 排序结果（供列表视图使用）
 */
export function useFilteredRequirements(
  sortKey?: SortKey,
  sortDir?: 'asc' | 'desc',
) {
  const { state } = useRequirements();

  const filtered = useMemo(() => {
    // 先按当前项目过滤
    const projectReqs = state.currentProjectId
      ? state.requirements.filter(
          (r) => r.projectId === state.currentProjectId,
        )
      : state.requirements;

    // 再应用筛选条件
    let result = applyFilter(projectReqs, state.filter);
    if (sortKey && sortDir) {
      result = sortRequirements(result, sortKey, sortDir);
    }
    return result;
  }, [
    state.requirements,
    state.currentProjectId,
    state.filter,
    sortKey,
    sortDir,
  ]);

  return filtered;
}

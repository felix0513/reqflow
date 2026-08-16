import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useRequirements } from '@/context/RequirementsContext';
import { useFilteredRequirements } from '@/hooks/useFilteredRequirements';
import { useToast } from '@/hooks/useToast';
import { RequirementTable } from './RequirementTable';
import { EmptyState } from '@/components/common/EmptyState';
import type { SortKey, Status } from '@/types';

/**
 * 列表视图容器
 * 使用筛选+排序派生数据，渲染表格或空状态
 */
export function ListView() {
  const { state, dispatch } = useRequirements();
  const toast = useToast();

  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useFilteredRequirements(sortKey, sortDir);

  const handleSort = useCallback(
    (key: SortKey) => {
      setSortKey((prevKey) => {
        if (key === prevKey) {
          setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
          return prevKey;
        }
        setSortDir('desc');
        return key;
      });
    },
    [],
  );

  const handleToggleSelect = useCallback(
    (id: string) => {
      const next = state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id];
      dispatch({ type: 'SELECTION_SET', payload: next });
    },
    [state.selectedIds, dispatch],
  );

  // 全空状态（当前项目无需求）
  const projectReqCount = state.currentProjectId
    ? state.requirements.filter((r) => r.projectId === state.currentProjectId).length
    : state.requirements.length;

  if (projectReqCount === 0) {
    return (
      <EmptyState
        title="暂无需求"
        description="点击右上角「新建」创建第一条需求，开始管理你的需求流程"
        actionLabel="创建第一条需求"
        onAction={() =>
          dispatch({ type: 'DRAWER_OPEN', payload: { id: null } })
        }
      />
    );
  }

  // 筛选无结果
  if (filtered.length === 0) {
    return (
      <EmptyState
        title="没有匹配的需求"
        description="尝试调整筛选条件或搜索关键词"
        actionLabel="重置筛选"
        onAction={() => dispatch({ type: 'FILTER_RESET' })}
      />
    );
  }

  return (
    <Box>
      <RequirementTable
        rows={filtered}
        categories={state.categories}
        selectedIds={state.selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={(ids) =>
          dispatch({ type: 'SELECTION_SET', payload: ids })
        }
        onSort={handleSort}
        sortKey={sortKey}
        sortDir={sortDir}
        onEdit={(id) => dispatch({ type: 'DRAWER_OPEN', payload: { id } })}
        onQuickStatus={(id, status: Status) => {
          dispatch({ type: 'REQ_UPDATE', payload: { id, status } });
          toast.success('状态已更新');
        }}
        onDelete={(id) => {
          dispatch({ type: 'REQ_DELETE', payload: { id } });
          toast.success('需求已删除');
        }}
      />
    </Box>
  );
}

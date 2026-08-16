import { useState, useMemo } from 'react';
import { Box, Paper } from '@mui/material';
import { useRequirements } from '@/context/RequirementsContext';
import { collectAllTags } from '@/constants/filter';
import { useToast } from '@/hooks/useToast';
import { exportRequirementsBatch, type ExportFormat } from '@/services/export';
import { FilterBar } from './FilterBar';
import { BatchActionBar } from './BatchActionBar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

/**
 * 工具栏容器：始终展示筛选栏，选中需求时额外展示批量操作栏
 */
export function Toolbar() {
  const { state, dispatch } = useRequirements();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allTags = useMemo(
    () =>
      collectAllTags(
        state.currentProjectId
          ? state.requirements.filter(
              (r) => r.projectId === state.currentProjectId,
            )
          : state.requirements,
      ),
    [state.requirements, state.currentProjectId],
  );

  const selectedCount = state.selectedIds.length;

  const handleBatchDelete = () => {
    dispatch({
      type: 'REQ_BATCH_DELETE',
      payload: { ids: state.selectedIds },
    });
    setConfirmDelete(false);
    toast.success(`已删除 ${selectedCount} 条需求`);
  };

  // 批量导出选中需求为一个文档
  const handleBatchExport = async (format: ExportFormat) => {
    const reqs = state.requirements.filter((r) => state.selectedIds.includes(r.id));
    if (reqs.length === 0) return;
    const project = state.projects.find((p) => p.id === state.currentProjectId) ?? null;
    try {
      await exportRequirementsBatch(format, reqs, state.categories, project);
      toast.success(`已导出 ${reqs.length} 条需求为 ${format.toUpperCase()}`);
    } catch {
      toast.error('导出失败');
    }
  };

  return (
    <Box className="mb-3">
      <Paper
        variant="outlined"
        sx={{ p: 1.5, px: 2, borderRadius: 2, bgcolor: 'background.paper' }}
      >
        <FilterBar
          filter={state.filter}
          categories={state.categories}
          allTags={allTags}
          onChange={(patch) => dispatch({ type: 'FILTER_SET', payload: patch })}
          onReset={() => dispatch({ type: 'FILTER_RESET' })}
        />
      </Paper>

      {selectedCount > 0 && (
        <BatchActionBar
          count={selectedCount}
          onSetStatus={(status) => {
            dispatch({
              type: 'REQ_BATCH_UPDATE',
              payload: { ids: state.selectedIds, patch: { status } },
            });
            toast.success(`已更新 ${selectedCount} 条需求的状态`);
          }}
          onSetPriority={(priority) => {
            dispatch({
              type: 'REQ_BATCH_UPDATE',
              payload: { ids: state.selectedIds, patch: { priority } },
            });
            toast.success(`已更新 ${selectedCount} 条需求的优先级`);
          }}
          onDelete={() => setConfirmDelete(true)}
          onClear={() => dispatch({ type: 'SELECTION_SET', payload: [] })}
          onExport={handleBatchExport}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="批量删除需求"
        message={`确定要删除选中的 ${selectedCount} 条需求吗？此操作不可撤销。`}
        confirmText="删除"
        danger
        onConfirm={handleBatchDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Box>
  );
}

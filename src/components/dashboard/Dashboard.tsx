import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useRequirements } from '@/context/RequirementsContext';
import { isOverdue } from '@/constants/format';
import type { Status, Priority } from '@/types';
import { StatCards } from './StatCards';
import { StatusPieChart } from './StatusPieChart';
import { PriorityBarChart } from './PriorityBarChart';

/**
 * 统计概览容器
 * 包含统计卡片 + 状态饼图 + 优先级柱状图
 * 所有统计基于当前选中项目的需求
 * 图表点击可触发筛选（作用于列表/看板视图）
 */
export function Dashboard() {
  const { state, dispatch } = useRequirements();

  // 按当前项目过滤需求
  const projectReqs = useMemo(
    () =>
      state.currentProjectId
        ? state.requirements.filter(
            (r) => r.projectId === state.currentProjectId,
          )
        : state.requirements,
    [state.requirements, state.currentProjectId],
  );

  const overdueCount = useMemo(
    () => projectReqs.filter(isOverdue).length,
    [projectReqs],
  );

  // 点击状态扇区 → 应用状态筛选
  const handleStatusClick = (status: Status) => {
    dispatch({ type: 'FILTER_SET', payload: { statuses: [status] } });
  };

  // 点击优先级柱状 → 应用优先级筛选
  const handlePriorityClick = (priority: Priority) => {
    dispatch({ type: 'FILTER_SET', payload: { priorities: [priority] } });
  };

  // 点击逾期卡片 → 切换逾期筛选
  const handleOverdueClick = () => {
    dispatch({
      type: 'FILTER_SET',
      payload: { overdueOnly: !state.filter.overdueOnly },
    });
  };

  return (
    <Box className="mb-4">
      <StatCards
        requirements={projectReqs}
        overdueCount={overdueCount}
        overdueActive={state.filter.overdueOnly}
        onOverdueClick={handleOverdueClick}
      />
      <Box className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StatusPieChart
          requirements={projectReqs}
          onSliceClick={handleStatusClick}
        />
        <PriorityBarChart
          requirements={projectReqs}
          onBarClick={handlePriorityClick}
        />
      </Box>
    </Box>
  );
}

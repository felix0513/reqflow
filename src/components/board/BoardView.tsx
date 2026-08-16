import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Box } from '@mui/material';
import { useRequirements } from '@/context/RequirementsContext';
import { useFilteredRequirements } from '@/hooks/useFilteredRequirements';
import { useToast } from '@/hooks/useToast';
import { STATUS_ORDER } from '@/constants/index';
import { BoardColumn } from './BoardColumn';
import { RequirementCardView } from './RequirementCard';
import { EmptyState } from '@/components/common/EmptyState';
import type { Requirement, Category, Status } from '@/types';

export interface BoardViewProps {
  requirements?: Requirement[];
  categories?: Category[];
}

/**
 * 看板视图容器（DndContext）
 * 支持跨列拖拽改状态 + 列内排序
 * 数据直接从 Context 获取，props 保留以兼容设计接口
 */
export function BoardView(_props?: BoardViewProps) {
  const { state, dispatch } = useRequirements();
  const toast = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 当前项目的需求（用于拖拽逻辑）
  const projectReqs = useMemo(
    () =>
      state.currentProjectId
        ? state.requirements.filter(
            (r) => r.projectId === state.currentProjectId,
          )
        : state.requirements,
    [state.requirements, state.currentProjectId],
  );

  // 筛选后的需求，按状态分组
  const filtered = useFilteredRequirements();
  const grouped = useMemo(() => {
    const map: Record<Status, Requirement[]> = {
      review: [],
      todo: [],
      doing: [],
      testing: [],
      done: [],
      closed: [],
    };
    filtered.forEach((r) => map[r.status].push(r));
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.order - b.order),
    );
    return map;
  }, [filtered]);

  const activeReq: Requirement | null = activeId
    ? projectReqs.find((r) => r.id === activeId) ?? null
    : null;
  const activeCategory: Category | undefined = activeReq
    ? state.categories.find((c) => c.id === activeReq.categoryId)
    : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;
    const activeReqItem = projectReqs.find(
      (r) => r.id === activeCardId,
    );
    if (!activeReqItem) return;

    let targetStatus: Status | null = null;
    let targetIndex = 0;

    // 判断拖放目标是列还是卡片
    if (STATUS_ORDER.includes(overId as Status)) {
      // 拖到列的空白处 → 放到该列末尾
      targetStatus = overId as Status;
      const colCards = projectReqs
        .filter((r) => r.status === targetStatus && r.id !== activeCardId)
        .sort((a, b) => a.order - b.order);
      targetIndex = colCards.length;
    } else {
      // 拖到某张卡片上 → 放到该卡片所在位置
      const overReq = projectReqs.find((r) => r.id === overId);
      if (!overReq) return;
      targetStatus = overReq.status;
      const colCards = projectReqs
        .filter(
          (r) => r.status === targetStatus && r.id !== activeCardId,
        )
        .sort((a, b) => a.order - b.order);
      targetIndex = colCards.findIndex((r) => r.id === overId);
      if (targetIndex === -1) targetIndex = colCards.length;
    }

    if (targetStatus) {
      dispatch({
        type: 'REQ_MOVE_STATUS',
        payload: { id: activeCardId, status: targetStatus, order: targetIndex },
      });
      if (activeReqItem.status !== targetStatus) {
        toast.success(
          `已移至「${STATUS_META_LABEL[targetStatus]}」`,
        );
      }
    }
  };

  // 空状态
  if (filtered.length === 0 && projectReqs.length === 0) {
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            cards={grouped[status]}
            categories={state.categories}
            onCardClick={(id) =>
              dispatch({ type: 'DRAWER_OPEN', payload: { id } })
            }
          />
        ))}
      </Box>

      <DragOverlay>
        {activeReq ? (
          <RequirementCardView
            req={activeReq}
            category={activeCategory}
            onClick={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// 状态中文标签映射
const STATUS_META_LABEL: Record<Status, string> = {
  review: '待评审',
  todo: '待开发',
  doing: '开发中',
  testing: '测试中',
  done: '已完成',
  closed: '已关闭',
};

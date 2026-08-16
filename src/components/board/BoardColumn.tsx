import { Box, Typography, Chip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { STATUS_META } from '@/constants/index';
import { RequirementCard } from './RequirementCard';
import type { Requirement, Category, Status } from '@/types';

export interface BoardColumnProps {
  status: Status;
  cards: Requirement[];
  categories: Category[];
  onCardClick: (id: string) => void;
}

/**
 * 看板单列（状态列，droppable）
 */
export function BoardColumn({
  status,
  cards,
  categories,
  onCardClick,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <Box
      ref={setNodeRef}
      className="flex w-72 flex-shrink-0 flex-col rounded-xl"
      sx={{
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : 'transparent',
        transition: 'border-color 0.15s ease',
        maxHeight: 'calc(100vh - 360px)',
        minHeight: 200,
      }}
    >
      {/* 列头 */}
      <Box className="flex items-center justify-between px-3 py-2">
        <Box className="flex items-center gap-1.5">
          <FiberManualRecordIcon sx={{ color: meta.color, fontSize: 12 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {meta.label}
          </Typography>
          <Chip
            label={cards.length}
            size="small"
            sx={{
              height: 18,
              fontSize: 11,
              bgcolor: 'background.paper',
              color: 'text.secondary',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Box>
      </Box>

      {/* 卡片区域 */}
      <Box
        className="flex-1 space-y-2 overflow-y-auto p-2"
        sx={{ minHeight: 80 }}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <RequirementCard
              key={card.id}
              req={card}
              category={categories.find((c) => c.id === card.categoryId)}
              onClick={() => onCardClick(card.id)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <Box
            className="flex items-center justify-center rounded-lg border border-dashed"
            sx={{
              py: 3,
              borderColor: 'divider',
              color: 'text.disabled',
            }}
          >
            <Typography variant="caption">拖拽需求到此处</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

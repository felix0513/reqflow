import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import EventIcon from '@mui/icons-material/Event';
import { PriorityChip } from '@/components/common/PriorityChip';
import { TagChip } from '@/components/common/TagChip';
import { STATUS_META } from '@/constants/index';
import { isOverdue, getDueDateLabel } from '@/constants/format';
import type { Requirement, Category } from '@/types';

export interface RequirementCardProps {
  req: Requirement;
  category?: Category;
  onClick: () => void;
}

/**
 * 卡片纯展示部分（供 DragOverlay 复用，不含 sortable 逻辑）
 */
export function RequirementCardView({
  req,
  category,
  onClick,
}: RequirementCardProps) {
  const overdue = isOverdue(req);
  const statusMeta = STATUS_META[req.status];

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 2px 8px rgba(99,102,241,0.12)',
        },
        transition: 'all 0.15s ease',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* 标题 */}
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 700,
            color: 'primary.main',
            display: 'block',
            mb: 0.5,
          }}
        >
          {req.code}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            lineHeight: 1.4,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {req.title}
        </Typography>

        {/* 优先级 + 分类 */}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
          <PriorityChip priority={req.priority} />
          {category && (
            <Box className="flex items-center gap-0.5">
              <FiberManualRecordIcon
                sx={{ fontSize: 10, color: category.color }}
              />
              <Typography variant="caption" color="text.secondary">
                {category.name}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* 标签 */}
        {req.tags.length > 0 && (
          <Box className="mb-1 flex flex-wrap gap-1">
            {req.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
            {req.tags.length > 3 && (
              <Typography variant="caption" color="text.secondary">
                +{req.tags.length - 3}
              </Typography>
            )}
          </Box>
        )}

        {/* 底部：状态点 + 版本 + 截止日期 */}
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-1">
            <Box className="flex items-center gap-0.5">
              <FiberManualRecordIcon
                sx={{ fontSize: 10, color: statusMeta.color }}
              />
              <Typography variant="caption" color="text.secondary">
                {statusMeta.label}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: 10,
                color: 'text.disabled',
                bgcolor: 'action.hover',
                px: 0.5,
                borderRadius: 0.5,
              }}
            >
              v{req.version}
            </Typography>
          </Box>
          {req.dueDate && (
            <Box
              className="flex items-center gap-0.5"
              sx={{ color: overdue ? 'error.main' : 'text.secondary' }}
            >
              <EventIcon sx={{ fontSize: 12 }} />
              <Typography variant="caption">
                {getDueDateLabel(req)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * 可拖拽的需求卡片（封装 useSortable）
 */
export function RequirementCard({
  req,
  category,
  onClick,
}: RequirementCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: req.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{ touchAction: 'none' }}
    >
      <RequirementCardView req={req} category={category} onClick={onClick} />
    </Box>
  );
}

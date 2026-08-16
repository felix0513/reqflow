import { Chip } from '@mui/material';
import { PRIORITY_META } from '@/constants/index';
import type { Priority } from '@/types';

interface PriorityChipProps {
  priority: Priority;
  size?: 'small' | 'medium';
}

/**
 * 优先级色块 Chip
 * 使用优先级颜色作为背景，白色文字，确保可访问性（不只靠颜色）
 */
export function PriorityChip({ priority, size = 'small' }: PriorityChipProps) {
  const meta = PRIORITY_META[priority];
  return (
    <Chip
      label={`${priority} ${meta.label}`}
      size={size}
      sx={{
        bgcolor: meta.color,
        color: '#ffffff',
        fontWeight: 600,
        height: size === 'small' ? 22 : 28,
        '& .MuiChip-label': {
          px: 1,
          fontSize: size === 'small' ? 11 : 13,
        },
      }}
    />
  );
}

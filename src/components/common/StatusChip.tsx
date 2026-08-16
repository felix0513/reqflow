import { Chip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { STATUS_META } from '@/constants/index';
import type { Status } from '@/types';

interface StatusChipProps {
  status: Status;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled';
}

/**
 * 状态色块 Chip
 * 使用状态颜色圆点 + 中文标签，明暗模式均可读
 */
export function StatusChip({
  status,
  size = 'small',
  variant = 'outlined',
}: StatusChipProps) {
  const meta = STATUS_META[status];
  return (
    <Chip
      icon={
        <FiberManualRecordIcon
          sx={{
            fontSize: size === 'small' ? 10 : 12,
            color: meta.color,
            ml: '6px',
          }}
        />
      }
      label={meta.label}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 600,
        height: size === 'small' ? 24 : 32,
        borderRadius: 1.5,
        borderColor: 'divider',
        color: 'text.secondary',
        '& .MuiChip-label': {
          px: 1,
          fontSize: size === 'small' ? 12 : 13,
        },
        ...(variant === 'filled' && {
          bgcolor: `${meta.color}1a`,
          color: meta.color,
          borderColor: 'transparent',
        }),
      }}
    />
  );
}

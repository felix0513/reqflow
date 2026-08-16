import { Chip } from '@mui/material';
import clsx from 'clsx';

interface TagChipProps {
  label: string;
  size?: 'small' | 'medium';
  color?: string;
  onDelete?: () => void;
  onClick?: () => void;
  active?: boolean;
}

/**
 * 标签 Chip
 * 使用靛蓝系浅色背景，支持删除/点击/选中态
 */
export function TagChip({
  label,
  size = 'small',
  color,
  onDelete,
  onClick,
  active = false,
}: TagChipProps) {
  return (
    <Chip
      label={label}
      size={size}
      onClick={onClick}
      onDelete={onDelete}
      className={clsx(onClick && 'cursor-pointer')}
      sx={{
        height: size === 'small' ? 22 : 28,
        borderRadius: 1.5,
        fontWeight: 500,
        bgcolor: active
          ? 'primary.main'
          : color
            ? `${color}1a`
            : 'action.selected',
        color: active ? '#fff' : color ?? 'text.secondary',
        border: active
          ? '1px solid transparent'
          : color
            ? `1px solid ${color}33`
            : '1px solid transparent',
        '& .MuiChip-label': {
          px: 1,
          fontSize: size === 'small' ? 11 : 13,
        },
        '&:hover': {
          bgcolor: active ? 'primary.dark' : color ? `${color}2a` : 'action.hover',
        },
      }}
    />
  );
}

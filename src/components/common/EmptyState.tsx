import { Box, Typography, Button } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * 空状态引导组件
 * 列表/看板无数据时渲染，给出创建入口
 */
export function EmptyState({
  title = '暂无数据',
  description = '当前条件下没有匹配的需求',
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Box className="flex flex-col items-center justify-center py-16 text-center">
      {icon ?? (
        <InboxOutlinedIcon
          sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}
        />
      )}
      <Typography variant="subtitle1" color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 360 }}
      >
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" color="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

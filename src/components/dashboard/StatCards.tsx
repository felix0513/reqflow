import { Card, CardContent, Box, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Requirement } from '@/types';

export interface StatCardsProps {
  requirements: Requirement[];
  overdueCount: number;
  /** 逾期筛选当前是否激活 */
  overdueActive?: boolean;
  /** 点击逾期卡片：切换逾期筛选 */
  onOverdueClick?: () => void;
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

/**
 * 统计卡片：总数 / 待开发 / 开发中 / 已完成 / 逾期
 * 逾期卡片可点击，切换列表/看板的逾期筛选
 */
export function StatCards({
  requirements,
  overdueCount,
  overdueActive = false,
  onOverdueClick,
}: StatCardsProps) {
  const items: StatItem[] = [
    {
      label: '需求总数',
      value: requirements.length,
      icon: <AssignmentIcon />,
      color: '#6366f1',
    },
    {
      label: '待开发',
      value: requirements.filter((r) => r.status === 'todo').length,
      icon: <HourglassEmptyIcon />,
      color: '#3b82f6',
    },
    {
      label: '开发中',
      value: requirements.filter((r) => r.status === 'doing').length,
      icon: <CodeIcon />,
      color: '#8b5cf6',
    },
    {
      label: '已完成',
      value: requirements.filter((r) => r.status === 'done').length,
      icon: <CheckCircleIcon />,
      color: '#22c55e',
    },
    {
      label: '逾期',
      value: overdueCount,
      icon: <WarningAmberIcon />,
      color: '#ef4444',
    },
  ];

  return (
    <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) =>
        item.label === '逾期' && onOverdueClick ? (
          <Card
            key={item.label}
            variant="outlined"
            component="button"
            onClick={onOverdueClick}
            sx={{
              borderRadius: 2,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
              borderColor: overdueActive ? 'error.main' : 'divider',
              bgcolor: overdueActive ? 'error.50' : 'background.paper',
              '&:hover': { borderColor: 'error.main', boxShadow: 1 },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box className="flex items-center justify-between">
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 12 }}
                  >
                    {item.label}
                    {overdueActive ? ' · 点击取消筛选' : ' · 点击筛选'}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mt: 0.5,
                      lineHeight: 1.2,
                      color: overdueActive ? 'error.main' : undefined,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: `${item.color}1a`,
                    color: item.color,
                    '& svg': { fontSize: 22 },
                  }}
                >
                  {item.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card key={item.label} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box className="flex items-center justify-between">
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 12 }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}
                  >
                    {item.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: `${item.color}1a`,
                    color: item.color,
                    '& svg': { fontSize: 22 },
                  }}
                >
                  {item.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ),
      )}
    </Box>
  );
}

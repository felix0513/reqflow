import { Card, CardContent, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PRIORITY_LIST } from '@/constants/index';
import type { Requirement, Priority } from '@/types';
import { EmptyState } from '@/components/common/EmptyState';

export interface PriorityBarChartProps {
  requirements: Requirement[];
  onBarClick?: (p: Priority) => void;
}

/**
 * 优先级分布柱状图
 * 点击柱状可触发筛选
 */
export function PriorityBarChart({
  requirements,
  onBarClick,
}: PriorityBarChartProps) {
  const labels = PRIORITY_LIST.map((p) => p.label);
  const counts = PRIORITY_LIST.map(
    (p) => requirements.filter((r) => r.priority === p.key).length,
  );
  const total = requirements.length;

  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ p: 2, height: '100%' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          优先级分布
        </Typography>
        {total === 0 ? (
          <EmptyState
            title="暂无数据"
            description="创建需求后此处将展示优先级分布"
          />
        ) : (
          <BarChart
            series={[
              {
                data: counts,
                color: '#6366f1',
                valueFormatter: (v) => `${v ?? 0}`,
              },
            ]}
            xAxis={[
              {
                data: labels,
                scaleType: 'band',
              },
            ]}
            height={250}
            margin={{ top: 10, bottom: 20, left: 0, right: 10 }}
            borderRadius={6}
            onAxisClick={(_event, data) => {
              if (data && onBarClick) {
                onBarClick(PRIORITY_LIST[data.dataIndex].key);
              }
            }}
            grid={{ horizontal: true }}
            slotProps={{
              axisLabel: {
                style: { fontSize: 11 },
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

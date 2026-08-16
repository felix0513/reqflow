import { Card, CardContent, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { STATUS_ORDER, STATUS_META } from '@/constants/index';
import type { Requirement, Status } from '@/types';
import { EmptyState } from '@/components/common/EmptyState';

export interface StatusPieChartProps {
  requirements: Requirement[];
  onSliceClick?: (s: Status) => void;
}

/**
 * 状态分布饼图
 * 点击扇区可触发筛选
 */
export function StatusPieChart({
  requirements,
  onSliceClick,
}: StatusPieChartProps) {
  const data = STATUS_ORDER.map((status, index) => ({
    id: index,
    value: requirements.filter((r) => r.status === status).length,
    label: STATUS_META[status].label,
    color: STATUS_META[status].color,
  }));
  const total = requirements.length;

  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ p: 2, height: '100%' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          状态分布
        </Typography>
        {total === 0 ? (
          <EmptyState
            title="暂无数据"
            description="创建需求后此处将展示状态分布"
          />
        ) : (
          <PieChart
            series={[
              {
                data,
                innerRadius: 40,
                outerRadius: 80,
                paddingAngle: 2,
                cornerRadius: 4,
                highlightScope: {
                  faded: 'global',
                  highlighted: 'item',
                },
              },
            ]}
            height={250}
            margin={{ top: 0, bottom: 10, left: 0, right: 0 }}
            onItemClick={(
              _event: React.MouseEvent,
              params: { dataIndex?: number },
            ) => {
              const idx = params?.dataIndex;
              if (idx != null && onSliceClick) {
                onSliceClick(STATUS_ORDER[idx]);
              }
            }}
            legend={{
              hidden: false,
              direction: 'row',
              position: { vertical: 'bottom', horizontal: 'middle' },
              labelStyle: { fontSize: 11 },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

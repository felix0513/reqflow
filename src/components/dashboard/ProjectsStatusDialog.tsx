import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import PrintIcon from '@mui/icons-material/Print';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import { STATUS_LIST, PRIORITY_LIST } from '@/constants/index';
import { summarizeProjects, exportStatusReport, type StatusReportFormat } from '@/services/statusReport';
import type { Status, Priority } from '@/types';

export interface ProjectsStatusDialogProps {
  open: boolean;
  onClose: () => void;
}

/** 状态中文名 → 颜色（与状态 Chip 一致） */
const STATUS_COLORS: Record<Status, string> = {
  review: '#f59e0b',
  todo: '#3b82f6',
  doing: '#8b5cf6',
  testing: '#06b6d4',
  done: '#22c55e',
  closed: '#94a3b8',
};

/**
 * 所有项目状态仪表盘弹窗
 * 按项目分列：总数 / 各状态数量 / 逾期 / 完成率 / 优先级分布
 * 支持导出 Markdown / HTML / PDF
 */
export function ProjectsStatusDialog({ open, onClose }: ProjectsStatusDialogProps) {
  const { state } = useRequirements();
  const toast = useToast();
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);

  const summaries = useMemo(
    () => (open ? summarizeProjects(state.projects, state.requirements) : []),
    [open, state.projects, state.requirements],
  );

  const handleExport = async (format: StatusReportFormat) => {
    setExportAnchor(null);
    try {
      await exportStatusReport(format, summaries);
      toast.success(`项目状态报告已导出为 ${format.toUpperCase()}`);
    } catch {
      toast.error('导出失败');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center gap-2" sx={{ pr: 8 }}>
        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, flex: 1 }}>
          所有项目状态仪表盘
        </Typography>
        <Tooltip title="导出报告">
          <Button
            size="small"
            variant="outlined"
            startIcon={<IosShareIcon />}
            onClick={(e) => setExportAnchor(e.currentTarget)}
          >
            导出
          </Button>
        </Tooltip>
        <Menu
          anchorEl={exportAnchor}
          open={Boolean(exportAnchor)}
          onClose={() => setExportAnchor(null)}
        >
          <MenuItem onClick={() => handleExport('markdown')}>
            <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
            Markdown (.md)
          </MenuItem>
          <MenuItem onClick={() => handleExport('html')}>
            <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
            HTML (.html)
          </MenuItem>
          <MenuItem onClick={() => handleExport('pdf')}>
            <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
            PDF
          </MenuItem>
        </Menu>
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        {summaries.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            暂无项目
          </Typography>
        ) : (
          <Box className="flex flex-col gap-2.5">
            {summaries.map((s) => (
              <Box
                key={s.project.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                {/* 项目名 + 关键指标 */}
                <Box className="flex flex-wrap items-center gap-2" sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: s.project.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {s.project.name}
                  </Typography>
                  <Chip label={`总数 ${s.total}`} size="small" variant="outlined" sx={{ height: 22 }} />
                  <Chip
                    label={`逾期 ${s.overdue}`}
                    size="small"
                    sx={{
                      height: 22,
                      bgcolor: s.overdue > 0 ? 'error.main' : 'action.hover',
                      color: s.overdue > 0 ? '#fff' : 'text.secondary',
                    }}
                  />
                  <Chip
                    label={`完成率 ${s.completionRate}%`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ minWidth: 140, maxWidth: 220, flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={s.completionRate}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Box>

                {/* 状态分布 */}
                <Box className="flex flex-wrap gap-1">
                  {STATUS_LIST.map((st) => {
                    const v = s.statusCounts[st.key as Status];
                    if (v === 0) return null;
                    return (
                      <Chip
                        key={st.key}
                        label={`${st.label} ${v}`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 12,
                          bgcolor: `${STATUS_COLORS[st.key as Status]}1a`,
                          color: STATUS_COLORS[st.key as Status],
                          fontWeight: 600,
                        }}
                      />
                    );
                  })}
                  {s.total === 0 && (
                    <Typography variant="caption" color="text.disabled">
                      暂无需求
                    </Typography>
                  )}
                </Box>

                {/* 优先级分布 */}
                <Box className="mt-1 flex flex-wrap gap-1">
                  {PRIORITY_LIST.map((p) => {
                    const v = s.priorityCounts[p.key as Priority];
                    if (v === 0) return null;
                    return (
                      <Chip
                        key={p.key}
                        label={`${p.key} ${v}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: 12 }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import IosShareIcon from '@mui/icons-material/IosShare';
import { PRIORITY_LIST, STATUS_LIST } from '@/constants/index';
import type { Priority, Status } from '@/types';
import type { ExportFormat } from '@/services/export';

export interface BatchActionBarProps {
  count: number;
  onSetStatus: (status: Status) => void;
  onSetPriority: (priority: Priority) => void;
  onDelete: () => void;
  onClear: () => void;
  /** 批量导出选中需求为一个文档 */
  onExport: (format: ExportFormat) => void;
}

/**
 * 批量操作栏：选中需求时显示
 * 支持批量改状态 / 改优先级 / 删除
 */
export function BatchActionBar({
  count,
  onSetStatus,
  onSetPriority,
  onDelete,
  onClear,
  onExport,
}: BatchActionBarProps) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        mt: 1,
        p: 1,
        px: 2,
        borderRadius: 2,
        borderColor: 'primary.main',
        bgcolor: 'primary.50',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        已选 {count} 项
      </Typography>

      <Box className="flex items-center gap-1.5">
        {/* 批量改状态 */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value=""
            displayEmpty
            onChange={(e) => {
              if (e.target.value) onSetStatus(e.target.value as Status);
            }}
            IconComponent={ArrowDropDownIcon}
            renderValue={() => (
              <span style={{ fontSize: 13, color: 'inherit' }}>改状态</span>
            )}
            sx={{
              borderRadius: 8,
              bgcolor: 'background.paper',
              fontSize: 13,
              '& .MuiSelect-select': { py: 0.75, px: 1.5 },
            }}
          >
            {STATUS_LIST.map((s) => (
              <MenuItem key={s.key} value={s.key}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 批量改优先级 */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value=""
            displayEmpty
            onChange={(e) => {
              if (e.target.value) onSetPriority(e.target.value as Priority);
            }}
            IconComponent={ArrowDropDownIcon}
            renderValue={() => (
              <span style={{ fontSize: 13, color: 'inherit' }}>改优先级</span>
            )}
            sx={{
              borderRadius: 8,
              bgcolor: 'background.paper',
              fontSize: 13,
              '& .MuiSelect-select': { py: 0.75, px: 1.5 },
            }}
          >
            {PRIORITY_LIST.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.key} {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 批量导出 */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value=""
            displayEmpty
            onChange={(e) => {
              if (e.target.value) onExport(e.target.value as ExportFormat);
            }}
            IconComponent={ArrowDropDownIcon}
            renderValue={() => (
              <span style={{ fontSize: 13, color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IosShareIcon sx={{ fontSize: 15 }} />
                导出
              </span>
            )}
            sx={{
              borderRadius: 8,
              bgcolor: 'background.paper',
              fontSize: 13,
              '& .MuiSelect-select': { py: 0.75, px: 1.5 },
            }}
          >
            <MenuItem value="excel">Excel (.xlsx)</MenuItem>
            <MenuItem value="csv">CSV (.csv)</MenuItem>
            <MenuItem value="markdown">Markdown (.md)</MenuItem>
            <MenuItem value="html">HTML (.html)</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
          </Select>
        </FormControl>

        {/* 批量删除 */}
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onDelete}
          sx={{ borderRadius: 8, textTransform: 'none' }}
        >
          删除
        </Button>
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* 清除选择 */}
      <IconButton size="small" onClick={onClear}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}

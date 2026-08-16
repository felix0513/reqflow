import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  IconButton,
  Select,
  MenuItem,
  Box,
  Paper,
  Tooltip,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { PriorityChip } from '@/components/common/PriorityChip';
import { StatusChip } from '@/components/common/StatusChip';
import { TagChip } from '@/components/common/TagChip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { STATUS_LIST } from '@/constants/index';
import { formatDate, isOverdue, getDueDateLabel } from '@/constants/format';
import { copyText } from '@/services/links';
import type {
  Requirement,
  Category,
  SortKey,
  Status,
} from '@/types';

export interface RequirementTableProps {
  rows: Requirement[];
  categories: Category[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onSort: (key: SortKey) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onEdit: (id: string) => void;
  onQuickStatus: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}

const COLUMNS: { key: SortKey | 'code' | 'category' | 'tags' | 'version' | 'attachments' | 'actions'; label: string; sortable: boolean; width?: string }[] = [
  { key: 'code', label: 'ID 号', sortable: false, width: '120px' },
  { key: 'title', label: '标题', sortable: true },
  { key: 'category', label: '分类', sortable: false, width: '100px' },
  { key: 'priority', label: '优先级', sortable: true, width: '90px' },
  { key: 'status', label: '状态', sortable: true, width: '130px' },
  { key: 'tags', label: '标签', sortable: false, width: '140px' },
  { key: 'version', label: '版本', sortable: false, width: '80px' },
  { key: 'dueDate', label: '截止日期', sortable: true, width: '120px' },
  { key: 'updatedAt', label: '更新时间', sortable: true, width: '140px' },
  { key: 'actions', label: '操作', sortable: false, width: '90px' },
];

/**
 * 需求表格：排序 / 多选 / 行内快捷状态切换 / 行操作
 */
export function RequirementTable({
  rows,
  categories,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  sortKey,
  sortDir,
  onEdit,
  onQuickStatus,
  onDelete,
}: RequirementTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = allIds.some((id) => selectedIds.includes(id));

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleCopyId = async (code: string) => {
    await copyText(code);
  };

  return (
    <>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell padding="checkbox" sx={{ width: 48 }}>
                <Checkbox
                  size="small"
                  indeterminate={someSelected && !allSelected}
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(allSelected ? [] : allIds)}
                />
              </TableCell>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{ width: col.width, fontWeight: 600, whiteSpace: 'nowrap' }}
                  sortDirection={sortKey === col.key ? sortDir : false}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortDir : 'asc'}
                      onClick={() => onSort(col.key as SortKey)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const category = categories.find((c) => c.id === row.categoryId);
              const overdue = isOverdue(row);
              const selected = selectedIds.includes(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={selected}
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected}
                      onChange={() => onToggleSelect(row.id)}
                    />
                  </TableCell>
                  {/* ID 号 */}
                  <TableCell>
                    <Tooltip title="点击复制 ID 号">
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyId(row.code);
                        }}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.3,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'primary.main',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {row.code}
                        <ContentCopyIcon sx={{ fontSize: 12, opacity: 0.5 }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  {/* 标题 */}
                  <TableCell>
                    <Box
                      sx={{
                        maxWidth: 280,
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': { color: 'primary.main' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => onEdit(row.id)}
                    >
                      {row.title}
                    </Box>
                  </TableCell>
                  {/* 分类 */}
                  <TableCell>
                    {category ? (
                      <Box className="flex items-center gap-1">
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: category.color,
                          }}
                        />
                        <span>{category.name}</span>
                      </Box>
                    ) : (
                      <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>
                    )}
                  </TableCell>
                  {/* 优先级 */}
                  <TableCell>
                    <PriorityChip priority={row.priority} />
                  </TableCell>
                  {/* 状态（可快捷切换） */}
                  <TableCell>
                    <Select
                      size="small"
                      value={row.status}
                      onChange={(e) =>
                        onQuickStatus(row.id, e.target.value as Status)
                      }
                      sx={{
                        minWidth: 100,
                        '& .MuiSelect-select': { py: 0.5, px: 1, pr: 3 },
                      }}
                      renderValue={() => <StatusChip status={row.status} />}
                    >
                      {STATUS_LIST.map((s) => (
                        <MenuItem key={s.key} value={s.key}>
                          <StatusChip status={s.key} />
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  {/* 标签 */}
                  <TableCell>
                    <Box className="flex flex-wrap gap-1">
                      {row.tags.length === 0 ? (
                        <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>
                      ) : (
                        row.tags.slice(0, 2).map((tag) => (
                          <TagChip key={tag} label={tag} />
                        ))
                      )}
                      {row.tags.length > 2 && (
                        <TagChip label={`+${row.tags.length - 2}`} />
                      )}
                    </Box>
                  </TableCell>
                  {/* 版本 */}
                  <TableCell>
                    <Box
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'text.secondary',
                      }}
                    >
                      v{row.version}
                    </Box>
                  </TableCell>
                  {/* 截止日期 */}
                  <TableCell>
                    {row.dueDate ? (
                      <Box
                        sx={{
                          color: overdue ? 'error.main' : 'text.secondary',
                          fontWeight: overdue ? 600 : 400,
                          fontSize: 12,
                        }}
                      >
                        <Tooltip title={formatDate(row.dueDate)} placement="top">
                          <span>{getDueDateLabel(row)}</span>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>
                    )}
                  </TableCell>
                  {/* 更新时间 */}
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(row.updatedAt)}
                  </TableCell>
                  {/* 操作 */}
                  <TableCell align="right">
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => onEdit(row.id)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(row.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除需求"
        message="确定要删除这条需求吗？此操作不可撤销。"
        confirmText="删除"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

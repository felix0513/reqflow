import { useMemo, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Alert,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import { collectAllTags } from '@/constants/filter';
import { copyText } from '@/services/links';
import { exportSingleRequirement, type ExportFormat } from '@/services/export';
import { RequirementForm } from './RequirementForm';
import { VersionSelector } from '@/components/version/VersionSelector';
import { VersionHistory } from '@/components/version/VersionHistory';
import type {
  Category,
  Requirement,
  RequirementInput,
  Doc,
  FileItem,
} from '@/types';

export interface RequirementDrawerProps {
  open: boolean;
  editingId: string | null;
  categories: Category[];
  onClose: () => void;
  /** 预览库中文件/文档（附件点击时触发） */
  onPreviewRef?: (target: { kind: 'doc'; doc: Doc } | { kind: 'file'; file: FileItem }) => void;
}

/**
 * 右侧抽屉容器：创建/编辑需求
 * 集成 ID 号显示、版本选择器 + 版本历史时间线、单条导出、附件预览
 * 查看历史版本时表单为只读模式
 */
export function RequirementDrawer({
  open,
  editingId,
  categories,
  onClose,
  onPreviewRef,
}: RequirementDrawerProps) {
  const { state, createRequirement, updateRequirement, dispatch } = useRequirements();
  const toast = useToast();
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);

  const allTags = useMemo(
    () => collectAllTags(state.requirements),
    [state.requirements],
  );

  const editingReq = editingId
    ? state.requirements.find((r) => r.id === editingId) ?? null
    : null;

  // 如果正在查看历史版本，使用快照数据
  const viewingVersion = editingReq && state.viewingVersionId
    ? state.requirementVersions.find((v) => v.id === state.viewingVersionId) ?? null
    : null;

  const displayReq: Requirement | null = viewingVersion
    ? viewingVersion.snapshot
    : editingReq;

  const isViewingHistory = !!viewingVersion;

  const currentProject = state.projects.find(
    (p) => p.id === (editingReq?.projectId ?? state.currentProjectId),
  );

  const handleSubmit = (data: RequirementInput) => {
    if (editingId) {
      updateRequirement(editingId, data);
      toast.success('需求已更新');
    } else {
      createRequirement(data);
      toast.success('需求已创建');
    }
    onClose();
  };

  // 自动保存（编辑模式，查看历史版本时禁用）：不关闭抽屉、不打断输入
  const handleAutoSave = (data: RequirementInput) => {
    if (!editingId) return;
    updateRequirement(editingId, data);
    toast.success('已自动保存');
  };

  const handleBackToLatest = () => {
    dispatch({ type: 'VERSION_VIEW_SET', payload: null });
  };

  const handleCopyId = async () => {
    if (!displayReq) return;
    const ok = await copyText(displayReq.code);
    if (ok) toast.success('ID 号已复制');
    else toast.error('复制失败');
  };

  const handleExport = async (format: ExportFormat) => {
    setExportAnchor(null);
    if (!displayReq) return;
    try {
      await exportSingleRequirement(format, displayReq, categories, currentProject);
      toast.success(`已导出为 ${format.toUpperCase()}`);
    } catch {
      toast.error('导出失败');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      ModalProps={{ keepMounted: false }}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 810 }, p: 3, overflowY: 'auto' },
      }}
    >
      {/* 头部 */}
      <Box className="mb-2 flex items-center justify-between">
        <Box className="flex items-center gap-1.5">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingId ? (isViewingHistory ? '查看历史版本' : '编辑需求') : '新建需求'}
          </Typography>
        </Box>
        <Box className="flex items-center gap-0.5">
          {/* 单条导出菜单（仅已有需求） */}
          {editingReq && (
            <>
              <Tooltip title="导出当前需求">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IosShareIcon />}
                  onClick={(e) => setExportAnchor(e.currentTarget)}
                  sx={{ mr: 0.5 }}
                >
                  导出
                </Button>
              </Tooltip>
              <Menu
                anchorEl={exportAnchor}
                open={Boolean(exportAnchor)}
                onClose={() => setExportAnchor(null)}
              >
                <MenuItem onClick={() => handleExport('excel')}>
                  <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                  Excel (.xlsx)
                </MenuItem>
                <MenuItem onClick={() => handleExport('csv')}>
                  <ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>
                  CSV (.csv)
                </MenuItem>
                <MenuItem onClick={() => handleExport('markdown')}>
                  <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                  Markdown (.md)
                </MenuItem>
                <MenuItem onClick={() => handleExport('html')}>
                  <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                  HTML (.html)
                </MenuItem>
                <MenuItem onClick={() => handleExport('pdf')}>
                  <ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>
                  PDF
                </MenuItem>
              </Menu>
            </>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ID 号（仅已有需求） */}
      {displayReq && (
        <Box className="flex items-center gap-1" sx={{ mb: 1 }}>
          <Chip
            label={displayReq.code}
            size="small"
            onClick={handleCopyId}
            icon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
            sx={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: '#fff',
              '& .MuiChip-icon': { color: '#fff', fontSize: 14 },
            }}
          />
          <Tooltip title="复制 ID 号">
            <Typography variant="caption" color="text.secondary">
              点击复制
            </Typography>
          </Tooltip>
          {(displayReq.creator || displayReq.owner) && (
            <Box sx={{ ml: 1 }} className="flex items-center gap-1">
              {displayReq.creator && (
                <Tooltip title="创建者">
                  <Chip
                    label={`创建：${displayReq.creator}`}
                    size="small"
                    variant="outlined"
                    icon={<PersonIcon sx={{ fontSize: 14 }} />}
                    sx={{ height: 24, '& .MuiChip-icon': { fontSize: 14 } }}
                  />
                </Tooltip>
              )}
              {displayReq.owner && (
                <Tooltip title="跟进者">
                  <Chip
                    label={`跟进：${displayReq.owner}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    icon={<GroupIcon sx={{ fontSize: 14 }} />}
                    sx={{ height: 24, '& .MuiChip-icon': { fontSize: 14 } }}
                  />
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* 版本信息 + 选择器（仅编辑模式） */}
      {editingReq && (
        <Box sx={{ mb: 2 }}>
          <Box className="flex items-center gap-2" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              版本
            </Typography>
            <VersionSelector
              requirementId={editingReq.id}
              currentVersion={editingReq.version}
            />
          </Box>

          {/* 查看历史版本提示 */}
          {isViewingHistory && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mb: 1.5,
                py: 0.5,
                '& .MuiAlert-message': { fontSize: 13 },
              }}
              action={
                <Chip
                  label="返回最新"
                  size="small"
                  clickable
                  onClick={handleBackToLatest}
                  icon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
                  sx={{ height: 24 }}
                />
              }
            >
              当前查看的是 v{viewingVersion!.version} 的历史快照（只读）
            </Alert>
          )}
        </Box>
      )}

      {/* 表单：key 随 editingId 变化以重置内部状态 */}
      <RequirementForm
        key={editingId ?? 'new'}
        initial={displayReq}
        categories={categories}
        allTags={allTags}
        onSubmit={handleSubmit}
        onCancel={onClose}
        readOnly={isViewingHistory}
        onPreviewRef={onPreviewRef}
        autoSave={!!editingId && !isViewingHistory}
        onAutoSave={handleAutoSave}
      />

      {/* 版本历史时间线（仅编辑模式） */}
      {editingReq && (
        <>
          <Divider sx={{ my: 2 }} />
          <VersionHistory requirementId={editingReq.id} />
        </>
      )}
    </Drawer>
  );
}

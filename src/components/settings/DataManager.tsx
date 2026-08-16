import { useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Typography,
  Divider,
  Stack,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import { storage } from '@/services/storage';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  exportToMarkdown,
  exportToHtml,
  exportToExcel,
  exportToCsv,
  exportToPdf,
} from '@/services/export';
import type { Requirement, Category } from '@/types';

/**
 * 数据管理：导出 JSON / 导入 JSON（覆盖或合并）/ 清空数据
 * 导出报告支持 Excel / CSV / PDF / HTML / Markdown，包含当前项目上下文和需求版本
 */
export function DataManager() {
  const { state, dispatch } = useRequirements();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [confirmClear, setConfirmClear] = useState(false);
  const [reportMenuAnchor, setReportMenuAnchor] = useState<HTMLElement | null>(null);

  // 当前项目的需求（用于导出）
  const projectReqs = state.currentProjectId
    ? state.requirements.filter((r) => r.projectId === state.currentProjectId)
    : state.requirements;
  const currentProject = state.projects.find((p) => p.id === state.currentProjectId) ?? null;

  const handleExport = () => {
    storage.downloadExport();
    toast.success('数据已导出为 JSON 文件');
  };

  /** 导出需求报告（Excel/CSV/PDF/HTML/Markdown） */
  const exportReport = async (format: 'excel' | 'csv' | 'pdf' | 'html' | 'markdown') => {
    setReportMenuAnchor(null);
    const ctx = {
      requirements: projectReqs,
      categories: state.categories,
      project: currentProject,
      title: `${currentProject?.name ?? '全部项目'} - 需求清单 ${new Date().toLocaleDateString('zh-CN')}`,
    };
    try {
      switch (format) {
        case 'excel':
          exportToExcel(ctx);
          break;
        case 'csv':
          exportToCsv(ctx);
          break;
        case 'pdf':
          await exportToPdf(ctx);
          break;
        case 'html':
          exportToHtml(ctx);
          break;
        case 'markdown':
          exportToMarkdown(ctx);
          break;
      }
      toast.success(`需求已导出为 ${format.toUpperCase()} 文件`);
    } catch {
      toast.error('导出失败，请稍后重试');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data.requirements)) {
          throw new Error('requirements 字段缺失或格式错误');
        }
        dispatch({
          type: 'DATA_IMPORT',
          payload: {
            requirements: data.requirements as Requirement[],
            categories: Array.isArray(data.categories)
              ? (data.categories as Category[])
              : undefined,
            mode: importMode,
          },
        });
        toast.success(
          `已${importMode === 'replace' ? '覆盖' : '合并'}导入 ${data.requirements.length} 条需求`,
        );
      } catch {
        toast.error('导入失败：文件格式不正确');
      }
    };
    reader.onerror = () => toast.error('读取文件失败');
    reader.readAsText(file);
    // 重置 input 以便重复导入同一文件
    e.target.value = '';
  };

  const handleClear = () => {
    dispatch({ type: 'DATA_CLEAR' });
    toast.success('所有需求已清空');
    setConfirmClear(false);
  };

  return (
    <Box>
      {/* 数据概览 */}
      <Box
        className="mb-4 rounded-lg p-3"
        sx={{ bgcolor: 'action.hover' }}
      >
        <Typography variant="body2" color="text.secondary">
          当前数据
        </Typography>
        <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {state.requirements.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              条需求（全部项目）
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {projectReqs.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              条需求（当前项目）
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {state.categories.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              个分类
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {state.projects.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              个项目
            </Typography>
          </Box>
        </Stack>
        {currentProject && (
          <Box sx={{ mt: 1 }}>
            <Chip
              size="small"
              label={`当前导出项目：${currentProject.name}`}
              sx={{ bgcolor: currentProject.color, color: '#fff', fontWeight: 600 }}
            />
          </Box>
        )}
      </Box>

      {/* 导出 */}
      <Box className="mb-4">
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          导出数据
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          可将当前项目需求导出为 JSON 备份，或生成 Excel / CSV / PDF / HTML / Markdown 报告文档（含需求版本信息）。
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={handleExport}
            disabled={state.requirements.length === 0}
          >
            导出 JSON
          </Button>
          <Button
            variant="contained"
            startIcon={<DescriptionOutlinedIcon />}
            onClick={(e) => setReportMenuAnchor(e.currentTarget)}
            disabled={projectReqs.length === 0}
          >
            导出报告
          </Button>
        </Stack>
        <Menu
          anchorEl={reportMenuAnchor}
          open={Boolean(reportMenuAnchor)}
          onClose={() => setReportMenuAnchor(null)}
        >
          <MenuItem onClick={() => exportReport('excel')}>
            <TableChartOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            Excel（.xlsx）
          </MenuItem>
          <MenuItem onClick={() => exportReport('csv')}>
            <GridOnOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            CSV（.csv）
          </MenuItem>
          <MenuItem onClick={() => exportReport('pdf')}>
            <PictureAsPdfOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            PDF 文档
          </MenuItem>
          <MenuItem onClick={() => exportReport('html')}>
            <CodeOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            HTML 网页
          </MenuItem>
          <MenuItem onClick={() => exportReport('markdown')}>
            <DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            Markdown
          </MenuItem>
        </Menu>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 导入 */}
      <Box className="mb-4">
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          导入数据
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          从 JSON 文件导入数据。请选择导入模式：
        </Typography>
        <ButtonGroup size="small" sx={{ mb: 1.5 }}>
          <Button
            variant={importMode === 'merge' ? 'contained' : 'outlined'}
            onClick={() => setImportMode('merge')}
          >
            合并（按 ID 覆盖）
          </Button>
          <Button
            variant={importMode === 'replace' ? 'contained' : 'outlined'}
            onClick={() => setImportMode('replace')}
          >
            覆盖（替换全部）
          </Button>
        </ButtonGroup>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={handleImportClick}
          >
            选择文件导入
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 清空 */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'error.main' }}>
          危险操作
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          清空将删除所有需求数据（分类保留）。此操作不可撤销，请谨慎操作。
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForeverOutlinedIcon />}
          onClick={() => setConfirmClear(true)}
          disabled={state.requirements.length === 0}
        >
          清空所有需求
        </Button>
      </Box>

      <ConfirmDialog
        open={confirmClear}
        title="清空所有需求"
        message="此操作将删除所有需求数据且不可撤销。分类设置将保留。确认继续？"
        confirmText="确认清空"
        danger
        requireText="清空"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </Box>
  );
}

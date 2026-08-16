import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Project } from '@/types';

const PROJECT_COLORS = [
  '#4F46E5', '#7C3AED', '#DC2626', '#EA580C',
  '#D97706', '#16A34A', '#0891B2', '#2563EB',
];

export interface ProjectManagerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 项目管理弹窗：新建 / 编辑 / 删除项目
 */
export function ProjectManager({ open, onClose }: ProjectManagerProps) {
  const { state, createProject, updateProject, deleteProject } = useRequirements();
  const toast = useToast();

  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(PROJECT_COLORS[0]);
    setEditing(null);
    setShowForm(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleStartEdit = (project: Project) => {
    setEditing(project);
    setName(project.name);
    setDescription(project.description);
    setColor(project.color);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    if (editing) {
      updateProject(editing.id, {
        name: name.trim(),
        description: description.trim(),
        color,
      });
      toast.success('项目已更新');
    } else {
      createProject({
        name: name.trim(),
        description: description.trim(),
        color,
      });
      toast.success('项目已创建');
    }
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const reqCount = state.requirements.filter(
      (r) => r.projectId === deleteTarget.id,
    ).length;
    deleteProject(deleteTarget.id);
    toast.success(`已删除项目「${deleteTarget.name}」${reqCount > 0 ? `及其 ${reqCount} 条需求` : ''}`);
    setDeleteTarget(null);
    if (editing?.id === deleteTarget.id) resetForm();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          项目管理
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* 项目列表 */}
          <List disablePadding>
            {state.projects.map((project) => {
              const reqCount = state.requirements.filter(
                (r) => r.projectId === project.id,
              ).length;
              const isCurrent = project.id === state.currentProjectId;
              return (
                <ListItem
                  key={project.id}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    bgcolor: isCurrent ? 'action.hover' : 'transparent',
                    border: '1px solid',
                    borderColor: isCurrent ? 'primary.light' : 'transparent',
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() => handleStartEdit(project)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(project)}
                          disabled={state.projects.length <= 1}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FolderOutlinedIcon sx={{ color: project.color }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box className="flex items-center gap-1">
                        <span style={{ fontWeight: 600 }}>{project.name}</span>
                        {isCurrent && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              bgcolor: 'primary.main',
                              color: '#fff',
                              px: 0.5,
                              borderRadius: 0.5,
                              fontSize: 10,
                            }}
                          >
                            当前
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={`${reqCount} 条需求${project.description ? ' · ' + project.description : ''}`}
                  />
                </ListItem>
              );
            })}
          </List>

          {/* 新建/编辑表单 */}
          {showForm ? (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                {editing ? '编辑项目' : '新建项目'}
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="项目名称"
                  required
                  fullWidth
                  size="small"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：电商APP V2.0"
                  autoFocus
                />
                <TextField
                  label="项目描述"
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要描述项目背景和目标…"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>项目颜色</InputLabel>
                  <Select
                    value={color}
                    label="项目颜色"
                    onChange={(e) => setColor(e.target.value)}
                    renderValue={(v) => (
                      <Box className="flex items-center gap-1.5">
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            bgcolor: v,
                          }}
                        />
                        <span>{v}</span>
                      </Box>
                    )}
                  >
                    {PROJECT_COLORS.map((c) => (
                      <MenuItem key={c} value={c}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: c,
                            mr: 1,
                            display: 'inline-block',
                          }}
                        />
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button onClick={resetForm} color="inherit">
                  取消
                </Button>
                <Button variant="contained" onClick={handleSubmit}>
                  {editing ? '保存' : '创建'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleStartCreate}
              sx={{ mt: 2 }}
              fullWidth
            >
              新建项目
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除项目"
        message={
          deleteTarget
            ? `确定要删除项目「${deleteTarget.name}」吗？该项目下的所有需求和版本记录将一并删除，此操作不可撤销。`
            : ''
        }
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

import { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  InputAdornment,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import { genId } from '@/constants/id';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Category } from '@/types';

// 预设色板
const COLOR_PRESETS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#6b7280',
];

/**
 * 分类管理：新增 / 编辑 / 删除分类
 */
export function CategoryManager() {
  const { state, dispatch } = useRequirements();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor(COLOR_PRESETS[0]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    const cat: Category = {
      id: editingId ?? genId(),
      name: name.trim(),
      color,
    };
    dispatch({ type: 'CATEGORY_UPSERT', payload: cat });
    toast.success(editingId ? '分类已更新' : '分类已添加');
    resetForm();
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      dispatch({ type: 'CATEGORY_DELETE', payload: { id: deleteTarget.id } });
      toast.success('分类已删除');
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) resetForm();
    }
  };

  return (
    <Box>
      {/* 新增/编辑表单 */}
      <Box className="mb-4 rounded-lg border border-dashed p-3" sx={{ borderColor: 'divider' }}>
        <Box className="flex flex-wrap items-center gap-2">
          <TextField
            label="分类名称"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ flex: 1, minWidth: 160 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <TextField
            size="small"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            sx={{ width: 60 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ m: 0 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      bgcolor: color,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={editingId ? <EditOutlinedIcon /> : <AddIcon />}
            onClick={handleSave}
          >
            {editingId ? '更新' : '添加'}
          </Button>
          {editingId && (
            <Button onClick={resetForm} color="inherit">
              取消
            </Button>
          )}
        </Box>

        {/* 色板快捷选择 */}
        <Box className="mt-2 flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((c) => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: c,
                cursor: 'pointer',
                border: color === c ? '2px solid' : '2px solid transparent',
                borderColor: color === c ? 'primary.main' : 'transparent',
                '&:hover': { opacity: 0.8 },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* 分类列表 */}
      <List>
        {state.categories.length === 0 && (
          <ListItem>
            <ListItemText
              primary="暂无分类"
              secondary="在上方添加你的第一个分类"
            />
          </ListItem>
        )}
        {state.categories.map((cat) => {
          const usageCount = state.requirements.filter(
            (r) => r.categoryId === cat.id,
          ).length;
          return (
            <ListItem
              key={cat.id}
              sx={{
                borderRadius: 1.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              secondaryAction={
                <>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleEdit(cat)}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={() => setDeleteTarget(cat)}
                    sx={{ ml: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </>
              }
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: cat.color,
                  mr: 1.5,
                }}
              />
              <ListItemText
                primary={cat.name}
                secondary={`${usageCount} 条需求`}
              />
            </ListItem>
          );
        })}
      </List>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除分类"
        message={`确定要删除分类「${deleteTarget?.name}」吗？该分类下的需求不会被删除，但其分类将显示为未知。`}
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

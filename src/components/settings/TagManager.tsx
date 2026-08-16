import { useMemo, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useRequirements } from '@/context/RequirementsContext';
import { useToast } from '@/hooks/useToast';
import { collectAllTags } from '@/constants/filter';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

/**
 * 标签管理：查看所有标签 / 重命名 / 删除
 * 标签存储于需求的 tags 字段，重命名/删除会批量更新相关需求
 */
export function TagManager() {
  const { state, dispatch } = useRequirements();
  const toast = useToast();

  const allTags = useMemo(
    () => collectAllTags(state.requirements),
    [state.requirements],
  );

  // 标签使用次数统计
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.requirements.forEach((r) =>
      r.tags.forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      }),
    );
    return counts;
  }, [state.requirements]);

  const [renameFrom, setRenameFrom] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const startRename = (tag: string) => {
    setRenameFrom(tag);
    setRenameTo(tag);
  };

  const handleRename = () => {
    if (!renameFrom || !renameTo.trim()) return;
    const newName = renameTo.trim();
    if (newName === renameFrom) {
      setRenameFrom(null);
      return;
    }
    // 批量更新包含该标签的需求
    state.requirements.forEach((r) => {
      if (r.tags.includes(renameFrom)) {
        const newTags = Array.from(
          new Set(r.tags.map((t) => (t === renameFrom ? newName : t))),
        );
        dispatch({ type: 'REQ_UPDATE', payload: { id: r.id, tags: newTags } });
      }
    });
    toast.success(`标签「${renameFrom}」已重命名为「${newName}」`);
    setRenameFrom(null);
    setRenameTo('');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // 批量从需求中移除该标签
    state.requirements.forEach((r) => {
      if (r.tags.includes(deleteTarget)) {
        dispatch({
          type: 'REQ_UPDATE',
          payload: {
            id: r.id,
            tags: r.tags.filter((t) => t !== deleteTarget),
          },
        });
      }
    });
    toast.success(`标签「${deleteTarget}」已删除`);
    setDeleteTarget(null);
  };

  return (
    <Box>
      {allTags.length === 0 ? (
        <Box className="py-8 text-center">
          <ListItemText
            primary="暂无标签"
            secondary="在创建或编辑需求时添加标签，此处将集中管理"
          />
        </Box>
      ) : (
        <List>
          {allTags.map((tag) => (
            <ListItem
              key={tag}
              sx={{
                borderRadius: 1.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              secondaryAction={
                <>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => startRename(tag)}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={() => setDeleteTarget(tag)}
                    sx={{ ml: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </>
              }
            >
              <Chip
                label={tag}
                size="small"
                sx={{ mr: 1.5, borderRadius: 1.5 }}
              />
              <ListItemText
                secondary={`${tagCounts[tag] ?? 0} 条需求使用`}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* 重命名弹窗 */}
      <Dialog
        open={renameFrom !== null}
        onClose={() => setRenameFrom(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>重命名标签</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="原标签"
              size="small"
              value={renameFrom ?? ''}
              disabled
            />
            <TextField
              label="新名称"
              size="small"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRenameFrom(null)} color="inherit">
            取消
          </Button>
          <Button
            onClick={handleRename}
            variant="contained"
            disabled={!renameTo.trim()}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除标签"
        message={`确定要删除标签「${deleteTarget}」吗？将从所有需求中移除该标签。`}
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

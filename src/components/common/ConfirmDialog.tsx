import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  /** 需要输入确认词（用于清空等高危操作） */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 通用二次确认弹窗
 * 支持 danger 模式（红色确认按钮）与 requireText（需输入确认词）
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [text, setText] = useState('');

  // 关闭时重置输入
  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  const canConfirm = requireText ? text.trim() === requireText : true;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText color="text.secondary">
          {message}
        </DialogContentText>
        {requireText && (
          <TextField
            fullWidth
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={requireText}
            sx={{ mt: 2 }}
            helperText={`请输入「${requireText}」以确认操作`}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={danger ? 'error' : 'primary'}
          variant="contained"
          disabled={!canConfirm}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

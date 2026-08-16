import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { useAccounts } from '@/context/AccountContext';
import { useToast } from '@/hooks/useToast';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 账号管理对话框
 * - 登录 / 注册（服务器模式需密码；本地模式仅用户名）
 * - 账号列表一键切换
 */
export function AccountDialog({ open, onClose }: AccountDialogProps) {
  const { serverMode, accounts, currentUser, register, login, logout } = useAccounts();
  const toast = useToast();
  const [tab, setTab] = useState<'login' | 'register'>(currentUser ? 'login' : 'register');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setUsername('');
    setDisplayName('');
    setPassword('');
  };

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const r =
        tab === 'register'
          ? await register(username, password, displayName)
          : await login(username, password);
      if (r.ok) {
        toast.success(tab === 'register' ? `账号「${username.trim()}」注册成功` : `已切换到账号「${username.trim()}」`);
        reset();
        onClose();
      } else {
        toast.error(r.error ?? '操作失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSwitch = async (name: string) => {
    const r = await login(name);
    if (r.ok) {
      toast.success(`已切换到账号「${name}」`);
      onClose();
    } else {
      toast.error(r.error ?? '切换失败');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle className="flex items-center gap-1.5" sx={{ pr: 8 }}>
        <VpnKeyIcon fontSize="small" />
        账号管理
        <Chip
          size="small"
          label={serverMode ? '服务器模式' : '本地模式'}
          color={serverMode ? 'primary' : 'default'}
          variant="outlined"
          sx={{ ml: 1 }}
        />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {currentUser && (
          <Box className="mb-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5" sx={{ bgcolor: 'action.hover' }}>
            <CheckCircleIcon fontSize="small" color="success" />
            <Typography variant="body2">
              当前账号：<Box component="span" sx={{ fontWeight: 700 }}>{currentUser}</Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" color="inherit" onClick={() => { logout(); toast.info('已退出登录'); }}>
              退出登录
            </Button>
          </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as 'login' | 'register')}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="登录 / 切换" value="login" />
          <Tab label="注册新账号" value="register" />
        </Tabs>

        <Box component="form" className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <TextField
            label="用户名"
            size="small"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
          {tab === 'register' && (
            <TextField
              label="显示名（可选）"
              size="small"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <TextField
            label={serverMode ? '密码' : '密码（本地模式可留空）'}
            type="password"
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={serverMode}
            InputProps={
              serverMode
                ? undefined
                : {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" color="text.secondary">
                          可空
                        </Typography>
                      </InputAdornment>
                    ),
                  }
            }
          />
          <Button type="submit" variant="contained" disabled={busy}>
            {tab === 'register' ? '注册并登录' : '登录'}
          </Button>
        </Box>

        {accounts.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 0.5 }}>
              系统内账号（点击切换）
            </Typography>
            <List dense disablePadding sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {accounts.map((a) => (
                <ListItemButton
                  key={a.username}
                  selected={a.username === currentUser}
                  onClick={() => void handleSwitch(a.username)}
                >
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={a.displayName ? `${a.displayName}（${a.username}）` : a.username}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

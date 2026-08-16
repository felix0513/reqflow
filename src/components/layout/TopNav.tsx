import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import type { ThemeMode, MainView, Project } from '@/types';
import { useAccounts } from '@/context/AccountContext';
import { useState } from 'react';
import { AccountDialog } from '@/components/account/AccountDialog';

export interface TopNavProps {
  view: MainView;
  onViewChange: (v: MainView) => void;
  keyword: string;
  onKeywordChange: (kw: string) => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onCreate: () => void;
  onOpenSettings: () => void;
  projects: Project[];
  currentProjectId: string | null;
  onProjectChange: (id: string) => void;
  onOpenProjectManager: () => void;
  /** 打开所有项目状态仪表盘 */
  onOpenProjectsStatus: () => void;
}

/**
 * 顶部导航：Logo / 项目选择 / 视图切换 / 搜索 / 主题 / 设置 / 新建
 */
export function TopNav({
  view,
  onViewChange,
  keyword,
  onKeywordChange,
  themeMode,
  onToggleTheme,
  onCreate,
  onOpenSettings,
  projects,
  currentProjectId,
  onProjectChange,
  onOpenProjectManager,
  onOpenProjectsStatus,
}: TopNavProps) {
  const isDark = themeMode === 'dark';
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const { currentUser } = useAccounts();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: '60px !important' }}>
        {/* Logo */}
        <Box className="flex items-center gap-1.5">
          <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            ReqFlow
          </Typography>
        </Box>

        {/* 项目选择器 */}
        {view !== 'docs' && (
          <Box className="flex items-center gap-1" sx={{ ml: 1 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={currentProjectId ?? ''}
                onChange={(e) => onProjectChange(e.target.value)}
                displayEmpty
                renderValue={() => (
                  <Box className="flex items-center gap-1">
                    {currentProject && (
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: currentProject.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {currentProject?.name ?? '选择项目'}
                    </Typography>
                  </Box>
                )}
                sx={{
                  borderRadius: 8,
                  bgcolor: 'action.hover',
                  '& .MuiSelect-select': { py: 0.75, px: 1.5 },
                }}
              >
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box className="flex items-center gap-1.5">
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: p.color,
                        }}
                      />
                      {p.name}
                    </Box>
                  </MenuItem>
                ))}
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.5, pt: 0.5 }}>
                  <MenuItem onClick={(e) => { e.stopPropagation(); onOpenProjectManager(); }}>
                    <FolderOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    管理项目…
                  </MenuItem>
                </Box>
              </Select>
            </FormControl>
          </Box>
        )}

        {/* 搜索框 */}
        <TextField
          placeholder="搜索需求标题、描述或标签…"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 360, ml: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 8, bgcolor: 'action.hover' },
          }}
        />

        <Box sx={{ flex: 1 }} />

        {/* 视图切换 */}
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v !== null) onViewChange(v as MainView);
          }}
          sx={{ mr: 0.5 }}
        >
          <ToggleButton value="list" sx={{ px: 1.5 }}>
            <Tooltip title="列表视图">
              <ViewListIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="board" sx={{ px: 1.5 }}>
            <Tooltip title="看板视图">
              <ViewKanbanIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="docs" sx={{ px: 1.5 }}>
            <Tooltip title="文档库">
              <DescriptionOutlinedIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {/* 所有项目状态仪表盘 */}
        {view !== 'docs' && (
          <Tooltip title="所有项目状态仪表盘">
            <Button
              size="small"
              startIcon={<DashboardIcon />}
              onClick={onOpenProjectsStatus}
              sx={{ ml: 0.5, borderRadius: 8, textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              所有项目状态
            </Button>
          </Tooltip>
        )}

        {/* 主题切换 */}
        <Tooltip title={isDark ? '切换到亮色模式' : '切换到暗色模式'}>
          <IconButton onClick={onToggleTheme} size="small">
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        {/* 账号（登录/注册/切换） */}
        <Tooltip title={currentUser ? `当前账号：${currentUser}（点击管理）` : '登录 / 注册账号'}>
          <Button
            size="small"
            startIcon={<AccountCircleIcon />}
            onClick={() => setAccountOpen(true)}
            sx={{ ml: 0.5, borderRadius: 8, textTransform: 'none', whiteSpace: 'nowrap', maxWidth: 160 }}
          >
            <Typography variant="body2" component="span" noWrap>
              {currentUser || '未登录'}
            </Typography>
          </Button>
        </Tooltip>
        <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />

        {/* 设置 */}
        <Tooltip title="设置">
          <IconButton onClick={onOpenSettings} size="small">
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* 新建按钮 */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onCreate}
          sx={{ ml: 0.5 }}
        >
          新建
        </Button>
      </Toolbar>
    </AppBar>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  IconButton,
} from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { CategoryManager } from './CategoryManager';
import { TagManager } from './TagManager';
import { DataManager } from './DataManager';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 设置弹窗：分类管理 / 标签管理 / 数据管理（Tab 切换）
 */
export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [tab, setTab] = useState(0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        设置
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 400 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab
            icon={<CategoryOutlinedIcon />}
            iconPosition="start"
            label="分类管理"
          />
          <Tab
            icon={<LabelOutlinedIcon />}
            iconPosition="start"
            label="标签管理"
          />
          <Tab
            icon={<StorageOutlinedIcon />}
            iconPosition="start"
            label="数据管理"
          />
        </Tabs>
        <Box>
          {tab === 0 && <CategoryManager />}
          {tab === 1 && <TagManager />}
          {tab === 2 && <DataManager />}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

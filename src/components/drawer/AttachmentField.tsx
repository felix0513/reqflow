import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import { useDocs } from '@/context/DocsContext';
import { useToast } from '@/hooks/useToast';
import { putBlob, delBlob } from '@/services/filedb';
import { genAttachmentId } from '@/services/idgen';
import { formatSize } from '@/components/docs/FileViewer';
import type { Attachment, Doc, FileItem } from '@/types';

interface AttachmentFieldProps {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  /** 打开库中文件/文档预览 */
  onPreviewRef?: (target: { kind: 'doc'; doc: Doc } | { kind: 'file'; file: FileItem }) => void;
  readOnly?: boolean;
}

/**
 * 需求参考文档附件输入区
 * - 拖拽本地文件上传（存 IndexedDB）
 * - 从文档库搜索选择文档/文件做关联
 * - 列表展示附件，支持删除与预览
 */
export function AttachmentField({
  value,
  onChange,
  onPreviewRef,
  readOnly = false,
}: AttachmentFieldProps) {
  const { docs, files } = useDocs();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState('');

  /** 添加上传文件附件 */
  const addUploadedFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list as ArrayLike<File>);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      const newAtts: Attachment[] = [];
      for (const file of arr) {
        const id = genAttachmentId();
        const ok = await putBlob(id, file);
        if (!ok) continue;
        newAtts.push({
          id,
          name: file.name,
          size: file.size,
          mime: file.type || 'application/octet-stream',
          source: 'upload',
          createdAt: new Date().toISOString(),
        });
      }
      if (newAtts.length > 0) {
        onChange([...value, ...newAtts]);
        toast.success(`已添加 ${newAtts.length} 个附件`);
      } else {
        toast.error('上传失败（存储不可用）');
      }
    } finally {
      setUploading(false);
    }
  };

  /** 从文档库关联（多选） */
  const handlePickFromLibrary = () => {
    setPickerOpen(true);
    setPickerKeyword('');
  };

  const handlePickConfirm = (selected: { doc?: Doc; file?: FileItem }[]) => {
    const newAtts: Attachment[] = selected.map((s) =>
      s.doc
        ? {
            id: genAttachmentId(),
            name: s.doc.title,
            size: new Blob([s.doc.content]).size,
            mime: 'text/markdown',
            source: 'doc' as const,
            refId: s.doc.id,
            createdAt: new Date().toISOString(),
          }
        : {
            id: genAttachmentId(),
            name: s.file!.name,
            size: s.file!.size,
            mime: s.file!.mime,
            source: 'file' as const,
            refId: s.file!.id,
            createdAt: new Date().toISOString(),
          },
    );
    if (newAtts.length > 0) {
      onChange([...value, ...newAtts]);
      toast.success(`已关联 ${newAtts.length} 个文档库条目`);
    }
    setPickerOpen(false);
  };

  const handleRemove = async (att: Attachment, index: number) => {
    // upload 来源需同步删除 IndexedDB 内容
    if (att.source === 'upload') {
      await delBlob(att.id);
    }
    onChange(value.filter((_, i) => i !== index));
  };

  const handlePreview = (att: Attachment) => {
    if (att.source === 'doc') {
      const doc = docs.find((d) => d.id === att.refId);
      if (doc) onPreviewRef?.({ kind: 'doc', doc });
    } else if (att.source === 'file') {
      const f = files.find((x) => x.id === att.refId);
      if (f) onPreviewRef?.({ kind: 'file', file: f });
    } else {
      // upload 来源：构造临时 FileItem 交给预览器（复用 FileViewer 逻辑）
      onPreviewRef?.({
        kind: 'file',
        file: {
          id: att.id,
          name: att.name,
          ext: att.name.split('.').pop()?.toLowerCase() ?? '',
          mime: att.mime,
          size: att.size,
          folderId: null,
          createdAt: att.createdAt,
          updatedAt: att.createdAt,
        },
      });
    }
  };

  return (
    <Box>
      <Box className="mb-1 flex items-center justify-between">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          参考文档附件
        </Typography>
        {!readOnly && (
          <Box className="flex gap-1">
            <Tooltip title="从文档库选择关联">
              <Button
                size="small"
                startIcon={<LinkIcon />}
                onClick={handlePickFromLibrary}
              >
                从文档库
              </Button>
            </Tooltip>
            <Tooltip title="上传本地文件（也可拖入下方区域）">
              <Button
                size="small"
                startIcon={<UploadFileIcon />}
                component="label"
                disabled={uploading}
              >
                上传
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files) void addUploadedFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* 拖拽区 */}
      {!readOnly && (
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) {
              void addUploadedFiles(e.dataTransfer.files);
            }
          }}
          sx={{
            border: '1px dashed',
            borderColor: dragOver ? 'primary.main' : 'divider',
            borderRadius: 1.5,
            p: 1.5,
            mb: 1,
            minHeight: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            bgcolor: dragOver ? 'action.hover' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <Box className="flex items-center justify-center gap-1">
              <CircularProgress size={14} />
              <Typography variant="caption" color="primary">上传中…</Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              将本地文件拖拽到此处上传
            </Typography>
          )}
        </Box>
      )}

      {/* 附件列表 */}
      {value.length === 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            p: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.disabled">
            暂无附件
          </Typography>
        </Box>
      ) : (
        <Box className="flex flex-wrap gap-1">
          {value.map((att, i) => (
            <Chip
              key={att.id}
              icon={
                att.source === 'upload' ? (
                  <UploadFileIcon sx={{ fontSize: 16 }} />
                ) : (
                  <LinkIcon sx={{ fontSize: 16 }} />
                )
              }
              label={
                <Box component="span" className="flex items-center gap-1">
                  <span>{att.name}</span>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ opacity: 0.6, fontSize: 10 }}
                  >
                    {formatSize(att.size)}
                  </Typography>
                </Box>
              }
              size="small"
              onClick={() => handlePreview(att)}
              onDelete={readOnly ? undefined : () => handleRemove(att, i)}
              sx={{ borderRadius: 1, maxWidth: 260 }}
            />
          ))}
        </Box>
      )}

      <LibraryPicker
        open={pickerOpen}
        keyword={pickerKeyword}
        onKeywordChange={setPickerKeyword}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickConfirm}
        existingRefs={value
          .filter((a) => a.refId)
          .map((a) => a.refId!) as string[]}
      />
    </Box>
  );
}

// ==================== 文档库选择器弹窗 ====================

interface LibraryPickerProps {
  open: boolean;
  keyword: string;
  onKeywordChange: (kw: string) => void;
  onClose: () => void;
  onConfirm: (selected: { doc?: Doc; file?: FileItem }[]) => void;
  existingRefs: string[];
}

function LibraryPicker({
  open,
  keyword,
  onKeywordChange,
  onClose,
  onConfirm,
  existingRefs,
}: LibraryPickerProps) {
  const { docs, files } = useDocs();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const kw = keyword.trim().toLowerCase();
  const docResults = docs.filter(
    (d) => !kw || d.title.toLowerCase().includes(kw) || d.content.toLowerCase().includes(kw),
  );
  const fileResults = files.filter((f) => !kw || f.name.toLowerCase().includes(kw));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const picks: { doc?: Doc; file?: FileItem }[] = [];
    docs.forEach((d) => {
      if (selected.has(d.id)) picks.push({ doc: d });
    });
    files.forEach((f) => {
      if (selected.has(f.id)) picks.push({ file: f });
    });
    onConfirm(picks);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>从文档库选择关联</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="搜索文档或文件…"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          sx={{ mb: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
          <List dense>
            {docResults.map((d) => {
              const isSel = selected.has(d.id);
              const isLinked = existingRefs.includes(d.id);
              return (
                <ListItemButton
                  key={d.id}
                  selected={isSel}
                  onClick={() => toggle(d.id)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <DescriptionIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={d.title}
                    secondary={`${isLinked ? '已关联 · ' : ''}文档`}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
            {fileResults.map((f) => {
              const isSel = selected.has(f.id);
              const isLinked = existingRefs.includes(f.id);
              return (
                <ListItemButton
                  key={f.id}
                  selected={isSel}
                  onClick={() => toggle(f.id)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AttachFileIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={f.name}
                    secondary={`${isLinked ? '已关联 · ' : ''}${f.ext.toUpperCase()} · ${formatSize(f.size)}`}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
            {docResults.length === 0 && fileResults.length === 0 && (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                {keyword ? '未找到匹配项' : '文档库暂无内容'}
              </Typography>
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          disabled={selected.size === 0}
          onClick={handleConfirm}
        >
          关联 {selected.size > 0 ? `(${selected.size})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

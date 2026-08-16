import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Card,
  CardActionArea,
  CardContent,
  CardActions,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Checkbox,
  Divider,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CloseIcon from '@mui/icons-material/Close';
import { useDocs } from '@/context/DocsContext';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/constants/format';
import { copyText, docLink, fileLink } from '@/services/links';
import { downloadBlobFile } from '@/services/filedb';
import { collectDropFiles } from '@/services/dragdrop';
import { formatSize } from '@/components/docs/FileViewer';
import type { Doc, FileItem } from '@/types';

interface DocsViewProps {
  onOpenDoc: (id: string) => void;
  onCreateDoc: () => void;
  onOpenFile: (file: FileItem) => void;
}

/** 扩展名 → 显示图标颜色 */
function extColor(ext: string): string {
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '#22c55e';
  if (['docx', 'doc'].includes(ext)) return '#3b82f6';
  if (ext === 'pdf') return '#ef4444';
  if (['html', 'htm'].includes(ext)) return '#f59e0b';
  if (['md', 'markdown'].includes(ext)) return '#6366f1';
  return '#6b7280';
}

/** 选择项 key：类型前缀 + id */
const selKey = (type: 'folder' | 'doc' | 'file', id: string) => `${type}:${id}`;

/**
 * 拖拽上传区域
 * - empty=true：库为空时的大区域（居中占满）
 * - empty=false：文件列表底部的常驻拖拽条
 * dragenter/dragleave 用计数器避免在子元素间移动时高亮闪烁
 */
function Dropzone(props: {
  empty?: boolean;
  dragOver: boolean;
  uploading: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  const { empty = false } = props;
  return (
    <Box
      onDragEnter={props.onDragEnter}
      onDragLeave={props.onDragLeave}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      onClick={props.onClick}
      className={
        empty
          ? 'flex flex-col items-center justify-center rounded-xl border-2 border-dashed'
          : 'flex flex-col items-center justify-center rounded-xl border-2 border-dashed'
      }
      sx={{
        borderColor: props.dragOver ? 'primary.main' : 'divider',
        bgcolor: props.dragOver ? 'action.selected' : 'transparent',
        transition: 'all 0.15s',
        minHeight: empty ? 260 : 120,
        cursor: 'pointer',
        '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
      }}
    >
      <CloudUploadIcon
        sx={{ fontSize: empty ? 44 : 30, color: props.dragOver ? 'primary.main' : 'text.disabled', mb: 1 }}
      />
      <Typography variant={empty ? 'body1' : 'body2'} sx={{ fontWeight: empty ? 600 : 500 }}>
        {props.uploading
          ? '正在上传文件…'
          : props.dragOver
            ? '松开鼠标即可上传'
            : '将本地文件或文件夹拖拽到此处上传'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        支持多选文件、整个文件夹（自动保留目录结构）；也可以点击此处选择文件
      </Typography>
    </Box>
  );
}

/**
 * 文档管理视图（对标飞书云文档 + 本地文件库）
 * 左侧：文件夹导航；右侧：文档列表 + 上传文件列表 + 搜索 + 上传 + 批量选择删除
 */
export function DocsView({ onOpenDoc, onCreateDoc, onOpenFile }: DocsViewProps) {
  const {
    docs,
    folders,
    files,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteDoc,
    uploadFiles,
    deleteFile,
    getFileBlob,
  } = useDocs();
  const toast = useToast();
  const [activeFolderId, setActiveFolderId] = useState<string | 'all' | 'uncat'>(
    'all',
  );
  const [keyword, setKeyword] = useState('');
  const [folderMenu, setFolderMenu] = useState<{
    anchor: HTMLElement;
    folderId: string | null;
  } | null>(null);
  const [docMenu, setDocMenu] = useState<{ anchor: HTMLElement; doc: Doc } | null>(
    null,
  );
  const [fileMenu, setFileMenu] = useState<{ anchor: HTMLElement; file: FileItem } | null>(
    null,
  );
  const [confirm, setConfirm] = useState<{
    type: 'folder' | 'doc' | 'file' | 'batch';
    id: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** 拖拽高亮计数器（dragenter/dragleave 成对触发，计数为 0 才取消高亮） */
  const dragDepth = useRef(0);

  /** 批量选择模式 */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const inFolder = (fid: string | null) =>
    activeFolderId === 'all'
      ? true
      : activeFolderId === 'uncat'
        ? fid === null
        : fid === activeFolderId;

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (!inFolder(d.folderId)) return false;
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        return (
          d.title.toLowerCase().includes(kw) ||
          d.content.toLowerCase().includes(kw)
        );
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, activeFolderId, keyword]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (!inFolder(f.folderId)) return false;
      if (keyword.trim()) {
        return f.name.toLowerCase().includes(keyword.trim().toLowerCase());
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, activeFolderId, keyword]);

  const folderCounts = useMemo(() => {
    const docCount = new Map<string, number>();
    docs.forEach((d) => {
      if (d.folderId) docCount.set(d.folderId, (docCount.get(d.folderId) ?? 0) + 1);
    });
    files.forEach((f) => {
      if (f.folderId) docCount.set(f.folderId, (docCount.get(f.folderId) ?? 0) + 1);
    });
    return docCount;
  }, [docs, files]);

  // —— 选择操作 ——
  const toggleSelected = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allKeys = useMemo(
    () => [
      ...filteredFiles.map((f) => selKey('file', f.id)),
      ...filteredDocs.map((d) => selKey('doc', d.id)),
      ...folders.map((f) => selKey('folder', f.id)),
    ],
    [filteredFiles, filteredDocs, folders],
  );

  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allKeys.every((k) => prev.has(k))) return new Set();
      return new Set([...prev, ...allKeys]);
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleBatchDelete = () => {
    const folderIds = [...selected].filter((k) => k.startsWith('folder:')).map((k) => k.slice(7));
    const docIds = [...selected].filter((k) => k.startsWith('doc:')).map((k) => k.slice(4));
    const fileIds = [...selected].filter((k) => k.startsWith('file:')).map((k) => k.slice(5));
    folderIds.forEach(deleteFolder);
    docIds.forEach(deleteDoc);
    fileIds.forEach(deleteFile);
    toast.success(`已删除 ${folderIds.length} 个文件夹、${docIds.length} 个文档、${fileIds.length} 个文件`);
    if (folderIds.includes(activeFolderId)) setActiveFolderId('all');
    exitSelectMode();
    setConfirm(null);
  };

  const handleNewFolder = () => {
    const name = window.prompt('请输入文件夹名称：');
    if (name && name.trim()) {
      createFolder(name.trim());
      toast.success('文件夹已创建');
    }
  };

  const handleRenameFolder = (id: string, current: string) => {
    const name = window.prompt('重命名文件夹：', current);
    if (name && name.trim()) {
      renameFolder(id, name.trim());
      toast.success('文件夹已重命名');
    }
  };

  const handleDeleteFolder = (id: string, name: string) => {
    setConfirm({ type: 'folder', id, name });
  };

  const handleDeleteDoc = (doc: Doc) => {
    setConfirm({ type: 'doc', id: doc.id, name: doc.title });
  };

  const handleDeleteFile = (file: FileItem) => {
    setConfirm({ type: 'file', id: file.id, name: file.name });
  };

  const confirmDelete = () => {
    if (!confirm) return;
    if (confirm.type === 'batch') {
      handleBatchDelete();
      return;
    }
    if (confirm.type === 'folder') {
      deleteFolder(confirm.id);
      toast.success(`文件夹「${confirm.name}」已删除，其中内容移入未分类`);
      if (activeFolderId === confirm.id) setActiveFolderId('all');
    } else if (confirm.type === 'doc') {
      deleteDoc(confirm.id);
      toast.success(`文档「${confirm.name}」已删除`);
    } else {
      deleteFile(confirm.id);
      toast.success(`文件「${confirm.name}」已删除`);
    }
    setConfirm(null);
  };

  /** 执行上传（文件数组 + 相对路径用于文件夹结构还原） */
  const doUpload = async (list: FileList | File[], relativePaths?: string[]) => {
    if (!list || (list as FileList).length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(
        list,
        activeFolderId !== 'all' && activeFolderId !== 'uncat' ? activeFolderId : null,
        relativePaths,
      );
      const total = (list as FileList).length;
      if (uploaded.length === total) {
        toast.success(`已上传 ${uploaded.length} 个文件`);
      } else {
        toast.warning(`已上传 ${uploaded.length}/${total} 个文件（部分文件过大或存储不可用）`);
      }
    } catch {
      toast.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  /** 文件夹上传：从 webkitRelativePath 还原目录结构 */
  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl || fl.length === 0) return;
    const rels: string[] = [];
    let hasDir = false;
    for (let i = 0; i < fl.length; i++) {
      const rp = (fl[i] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      rels.push(rp);
      if (rp.includes('/')) hasDir = true;
    }
    void doUpload(fl, hasDir ? rels : undefined);
    e.target.value = '';
  };

  /** 拖拽事件：进入/离开计数（子元素间移动不会误触发高亮消失） */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    // 必须 preventDefault，否则浏览器默认打开文件导致 drop 不生效
    e.preventDefault();
    e.stopPropagation();
  };

  /** 拖拽上传（支持文件夹递归读取） */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    // 收集被拖拽的文件（优先 webkitGetAsEntry 读取文件夹，回退到 files）
    const { files: collected, relativePaths } = await collectDropFiles(
      e.dataTransfer.items,
      e.dataTransfer.files,
    );
    if (collected.length > 0) {
      await doUpload(collected, relativePaths);
    }
  };

  const handleCopyLink = async (link: string) => {
    const ok = await copyText(link);
    if (ok) toast.success('链接已复制，可粘贴到需求描述或文档中关联');
    else toast.error('复制失败');
  };

  const handleDownloadFile = async (f: FileItem) => {
    const blob = await getFileBlob(f.id);
    if (blob) downloadBlobFile(blob, f.name);
    else toast.error('文件内容加载失败');
  };

  const isEmpty = filteredDocs.length === 0 && filteredFiles.length === 0;

  return (
    <Box className="flex h-full gap-3">
      {/* 左侧：文件夹导航 */}
      <Paper
        variant="outlined"
        className="w-56 shrink-0 p-2"
        sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
      >
        <Box className="mb-1 flex items-center justify-between px-1">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            文档库
          </Typography>
          <Tooltip title="新建文件夹">
            <IconButton size="small" onClick={handleNewFolder}>
              <CreateNewFolderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <List dense disablePadding>
          <ListItemButton
            selected={activeFolderId === 'all'}
            onClick={() => setActiveFolderId('all')}
          >
            <ListItemIcon sx={{ minWidth: 30 }}>
              <DescriptionIcon fontSize="small" color={activeFolderId === 'all' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText
              primary="全部"
              secondary={`${docs.length} 文档 · ${files.length} 文件`}
              primaryTypographyProps={{ noWrap: true }}
            />
          </ListItemButton>
          <ListItemButton
            selected={activeFolderId === 'uncat'}
            onClick={() => setActiveFolderId('uncat')}
          >
            <ListItemIcon sx={{ minWidth: 30 }}>
              <FolderOpenIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="未分类" />
          </ListItemButton>

          {folders.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, pt: 1, display: 'block' }}>
              我的文件夹
            </Typography>
          )}
          {folders.map((f) => {
            const key = selKey('folder', f.id);
            const checked = selected.has(key);
            return (
              <ListItemButton
                key={f.id}
                selected={selectMode ? false : activeFolderId === f.id}
                onClick={() => {
                  if (selectMode) toggleSelected(key);
                  else setActiveFolderId(f.id);
                }}
              >
                <ListItemIcon sx={{ minWidth: 30 }}>
                  {selectMode ? (
                    <Checkbox
                      size="small"
                      checked={checked}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(key);
                      }}
                    />
                  ) : (
                    <FolderIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={f.name}
                  secondary={`${folderCounts.get(f.id) ?? 0} 项`}
                  primaryTypographyProps={{ noWrap: true }}
                />
                {!selectMode && (
                  <IconButton
                    size="small"
                    component="span"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderMenu({ anchor: e.currentTarget, folderId: f.id });
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Paper>

      {/* 右侧：文档 + 文件列表（整块也是拖拽目标） */}
      <Box
        className="flex-1 overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          borderRadius: 2,
          border: dragOver ? '2px dashed' : 'none',
          borderColor: dragOver ? 'primary.main' : 'transparent',
          transition: 'border-color 0.15s',
        }}
      >
        <Box className="mb-3 flex flex-wrap items-center gap-2">
          <TextField
            placeholder="搜索文档或文件…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            size="small"
            sx={{ flex: 1, maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* 批量选择模式 */}
          {selectMode ? (
            <Box className="flex items-center gap-1.5">
              <Button size="small" onClick={toggleSelectAll} startIcon={<ChecklistIcon />}>
                {allSelected ? '取消全选' : '全选'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                已选 {selected.size} 项
              </Typography>
              <Button
                size="small"
                color="error"
                variant="contained"
                disabled={selected.size === 0}
                startIcon={<DeleteIcon />}
                onClick={() => setConfirm({ type: 'batch', id: '', name: '' })}
              >
                删除所选
              </Button>
              <Button size="small" onClick={exitSelectMode} startIcon={<CloseIcon />}>
                退出选择
              </Button>
            </Box>
          ) : (
            <Tooltip title="进入选择模式：批量勾选文件/文档/文件夹后删除">
              <Button
                size="small"
                variant="outlined"
                startIcon={<ChecklistIcon />}
                onClick={() => {
                  setSelectMode(true);
                  setSelected(new Set());
                }}
              >
                选择
              </Button>
            </Tooltip>
          )}

          <Box sx={{ flex: 1 }} />
          <Tooltip title="上传文件（支持多选，也可直接拖入）">
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              上传文件
            </Button>
          </Tooltip>
          <Tooltip title="上传整个文件夹（保留目录结构）">
            <Button
              variant="outlined"
              startIcon={<DriveFolderUploadIcon />}
              disabled={uploading}
              onClick={() => folderInputRef.current?.click()}
            >
              上传文件夹
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateDoc}
          >
            新建文档
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void doUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            hidden
            multiple
            // @ts-expect-error webkitdirectory 为非标准属性
            webkitdirectory="true"
            directory=""
            onChange={handleFolderInput}
          />
        </Box>

        {uploading && (
          <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1 }}>
            正在上传文件…
          </Typography>
        )}

        {isEmpty ? (
          /* 空库：大拖拽区域（可直接拖入上传） */
          <Dropzone
            empty
            dragOver={dragOver}
            uploading={uploading}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          />
        ) : (
          <>
            <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((d) => {
                const folder = folders.find((f) => f.id === d.folderId);
                const key = selKey('doc', d.id);
                const checked = selected.has(key);
                return (
                  <Card
                    key={d.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      ...(selectMode && checked
                        ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.selected' }
                        : {}),
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        if (selectMode) toggleSelected(key);
                        else onOpenDoc(d.id);
                      }}
                    >
                      <CardContent sx={{ pb: 0.5 }}>
                        <Box className="flex items-start justify-between">
                          <Box className="flex min-w-0 items-center gap-1.5">
                            {selectMode && (
                              <Checkbox
                                size="small"
                                checked={checked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleSelected(key)}
                                sx={{ p: 0.5, ml: -1 }}
                              />
                            )}
                            <DescriptionIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {d.title}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 40,
                          }}
                        >
                          {d.description || d.content.replace(/[#*`>_\-\[\]()]/g, '').slice(0, 80) || '（空文档）'}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 1.5, pt: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {folder ? `${folder.name} · ` : ''}更新于 {formatDateTime(d.updatedAt)}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        {!selectMode && (
                          <IconButton
                            size="small"
                            component="span"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocMenu({ anchor: e.currentTarget, doc: d });
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </CardActions>
                    </CardActionArea>
                  </Card>
                );
              })}

              {filteredFiles.map((f) => {
                const key = selKey('file', f.id);
                const checked = selected.has(key);
                return (
                  <Card
                    key={f.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      ...(selectMode && checked
                        ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.selected' }
                        : {}),
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        if (selectMode) toggleSelected(key);
                        else onOpenFile(f);
                      }}
                    >
                      <CardContent sx={{ pb: 0.5 }}>
                        <Box className="flex min-w-0 items-center gap-1.5">
                          {selectMode && (
                            <Checkbox
                              size="small"
                              checked={checked}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelected(key)}
                              sx={{ p: 0.5, ml: -1 }}
                            />
                          )}
                          <Typography
                            sx={{ fontSize: 11, fontWeight: 700, color: '#fff', bgcolor: extColor(f.ext), borderRadius: 1, px: 0.8, py: 0.2 }}
                          >
                            {f.ext.toUpperCase() || 'FILE'}
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {f.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 40 }}>
                          {formatSize(f.size)} · 上传于 {formatDateTime(f.createdAt)}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 1.5, pt: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {selectMode ? '勾选以批量删除' : '点击预览'}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        {!selectMode && (
                          <IconButton
                            size="small"
                            component="span"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileMenu({ anchor: e.currentTarget, file: f });
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </CardActions>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>

            {/* 文件列表下方：常驻拖拽上传区域 */}
            <Divider sx={{ my: 2 }} />
            <Dropzone
              dragOver={dragOver}
              uploading={uploading}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            />
          </>
        )}
      </Box>

      {/* 文件夹右键菜单 */}
      <Menu
        anchorEl={folderMenu?.anchor}
        open={Boolean(folderMenu)}
        onClose={() => setFolderMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (folderMenu?.folderId) {
              const f = folders.find((x) => x.id === folderMenu.folderId);
              handleRenameFolder(folderMenu.folderId, f?.name ?? '');
            }
            setFolderMenu(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> 重命名
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (folderMenu?.folderId) {
              const f = folders.find((x) => x.id === folderMenu.folderId);
              handleDeleteFolder(folderMenu.folderId, f?.name ?? '');
            }
            setFolderMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> 删除文件夹
        </MenuItem>
      </Menu>

      {/* 文档右键菜单 */}
      <Menu
        anchorEl={docMenu?.anchor}
        open={Boolean(docMenu)}
        onClose={() => setDocMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (docMenu) {
              onOpenDoc(docMenu.doc.id);
              setDocMenu(null);
            }
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> 打开编辑
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (docMenu) void handleCopyLink(docLink(docMenu.doc.id));
            setDocMenu(null);
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> 复制链接
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (docMenu) handleDeleteDoc(docMenu.doc);
            setDocMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> 删除文档
        </MenuItem>
      </Menu>

      {/* 文件右键菜单 */}
      <Menu
        anchorEl={fileMenu?.anchor}
        open={Boolean(fileMenu)}
        onClose={() => setFileMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (fileMenu) onOpenFile(fileMenu.file);
            setFileMenu(null);
          }}
        >
          <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} /> 打开预览
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (fileMenu) void handleCopyLink(fileLink(fileMenu.file.id));
            setFileMenu(null);
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> 复制链接
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (fileMenu) void handleDownloadFile(fileMenu.file);
            setFileMenu(null);
          }}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> 下载
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (fileMenu) handleDeleteFile(fileMenu.file);
            setFileMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> 删除文件
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === 'batch'
            ? '批量删除所选内容'
            : confirm?.type === 'folder'
              ? '删除文件夹'
              : confirm?.type === 'doc'
                ? '删除文档'
                : '删除文件'
        }
        message={
          confirm?.type === 'batch'
            ? `确定删除所选的 ${[...selected].filter((k) => k.startsWith('file:')).length} 个文件、${[...selected].filter((k) => k.startsWith('doc:')).length} 个文档和 ${[...selected].filter((k) => k.startsWith('folder:')).length} 个文件夹？文件/文档删除不可撤销；文件夹中的内容将移入未分类。`
            : confirm?.type === 'folder'
              ? `确定删除文件夹「${confirm?.name}」？其中的文档/文件将移入未分类，不会被删除。`
              : confirm?.type === 'doc'
                ? `确定删除文档「${confirm?.name}」？此操作不可撤销。`
                : `确定删除文件「${confirm?.name}」？此操作不可撤销。`
        }
        confirmText="确认删除"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  );
}

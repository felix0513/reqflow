import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PreviewIcon from '@mui/icons-material/Preview';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import MDEditor from '@uiw/react-md-editor';
import { useDocs } from '@/context/DocsContext';
import { useToast } from '@/hooks/useToast';
import type { Doc } from '@/types';

interface DocEditorProps {
  doc: Doc;
  onBack: () => void;
}

/**
 * 文档编辑器（对标飞书云文档）
 * - 左侧自动大纲（基于标题生成）
 * - Markdown 所见即所得编辑（@uiw/react-md-editor）
 * - 编辑/预览模式切换
 * - 导出 Markdown / HTML / PDF
 */
export function DocEditor({ doc, onBack }: DocEditorProps) {
  const { updateDoc } = useDocs();
  const toast = useToast();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const previewRef = useRef<HTMLDivElement>(null);

  // 自动保存（输入变化即保存到本地）
  const handleChange = (value?: string) => {
    setContent(value ?? '');
    updateDoc(doc.id, {
      content: value ?? '',
      title: title.trim() || doc.title,
    });
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    updateDoc(doc.id, { title: v.trim() || '未命名文档' });
  };

  // 从 Markdown 提取大纲（一级/二级/三级标题）
  const outline = useMemo(() => {
    return content
      .split('\n')
      .map((line) => {
        const m = line.match(/^(#{1,3})\s+(.+)$/);
        if (!m) return null;
        return {
          level: m[1].length,
          text: m[2].trim(),
          id: `h-${line.replace(/\s+/g, '-').slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [content]);

  // 大纲点击：预览模式滚动到对应标题
  const scrollToHeading = (index: number) => {
    if (mode !== 'preview') {
      setMode('preview');
      // 等待预览渲染完成后再滚动
      setTimeout(() => scrollToHeadingAt(index), 120);
      return;
    }
    scrollToHeadingAt(index);
  };

  const scrollToHeadingAt = (index: number) => {
    const root = previewRef.current;
    if (!root) return;
    const headings = root.querySelectorAll('h1, h2, h3');
    const target = headings[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExport = async (format: 'markdown' | 'html' | 'pdf') => {
    try {
      if (format === 'markdown') {
        const blob = new Blob([`# ${title}\n\n${content}`], {
          type: 'text/markdown;charset=utf-8',
        });
        downloadBlob(blob, `${title}.md`);
      } else if (format === 'html') {
        const html = buildDocHtml(title, content);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, `${title}.html`);
      } else {
        // PDF：Electron 走 printToPDF；浏览器 fallback 打印
        const html = buildDocHtml(title, content);
        const win = window as unknown as {
          reqflow?: { exportPdf?: (html: string) => Promise<{ ok: boolean; error?: string; canceled?: boolean }> };
        };
        if (win.reqflow?.exportPdf) {
          const result = await win.reqflow.exportPdf(html);
          if (!result.ok && !result.canceled) throw new Error(result.error ?? 'PDF 导出失败');
          if (result.canceled) return;
        } else {
          const w = window.open('', '_blank');
          if (w) {
            w.document.write(html);
            w.document.close();
            setTimeout(() => w.print(), 300);
          } else {
            throw new Error('弹窗被拦截，无法导出 PDF');
          }
        }
      }
      toast.success(`文档已导出为 ${format.toUpperCase()}`);
    } catch {
      toast.error('导出失败');
    }
  };

  const openInFolder = () => {
    const win = window as unknown as {
      reqflow?: { docOpenInFolder?: () => Promise<{ ok: boolean; error?: string }> };
    };
    if (win.reqflow?.docOpenInFolder) {
      win.reqflow.docOpenInFolder();
    } else {
      toast.info('当前为浏览器模式，本地文件存储仅桌面版可用');
    }
  };

  return (
    <Box className="flex h-full flex-col">
      {/* 工具栏 */}
      <Paper
        variant="outlined"
        className="mb-2 flex items-center gap-1 px-2 py-1"
        sx={{ borderRadius: 2 }}
      >
        <Tooltip title="返回文档库">
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <TextField
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          variant="standard"
          placeholder="文档标题"
          sx={{
            flex: 1,
            '& .MuiInput-underline:before': { borderBottom: 'none' },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
          }}
          InputProps={{ sx: { fontSize: 16, fontWeight: 600 } }}
        />
        <Tooltip title={mode === 'edit' ? '切换到预览' : '切换到编辑'}>
          <IconButton
            size="small"
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          >
            {mode === 'edit' ? (
              <PreviewIcon fontSize="small" />
            ) : (
              <EditOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="在本地文件夹中查看（桌面版）">
          <IconButton size="small" onClick={openInFolder}>
            <FolderOpenOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="导出 Markdown">
          <Button size="small" onClick={() => handleExport('markdown')}>
            .md
          </Button>
        </Tooltip>
        <Tooltip title="导出 HTML">
          <Button size="small" onClick={() => handleExport('html')}>
            .html
          </Button>
        </Tooltip>
        <Tooltip title="导出 PDF">
          <Button size="small" onClick={() => handleExport('pdf')}>
            .pdf
          </Button>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          自动保存
        </Typography>
      </Paper>

      {/* 编辑区：左侧大纲 + 右侧编辑器 */}
      <Box className="flex min-h-0 flex-1 gap-2">
        {/* 大纲 */}
        <Paper
          variant="outlined"
          className="w-48 shrink-0 overflow-y-auto p-2"
          sx={{ borderRadius: 2, display: outline.length ? 'block' : 'none' }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 1, fontWeight: 600, display: 'block', mb: 0.5 }}
          >
            大纲
          </Typography>
          {outline.map((item, idx) => (
            <Box
              key={item.id}
              onClick={() => scrollToHeading(idx)}
              sx={{
                pl: 1 + (item.level - 1) * 1.5,
                py: 0.4,
                fontSize: 13,
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover', borderRadius: 1 },
                borderRadius: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.text}
            </Box>
          ))}
        </Paper>

        {/* 编辑器 */}
        <Box
          className="min-w-0 flex-1 overflow-y-auto"
          data-color-mode="light"
          ref={previewRef}
        >
          <MDEditor
            value={content}
            onChange={handleChange}
            height="100%"
            preview={mode === 'edit' ? 'live' : 'preview'}
            textareaProps={{
              placeholder:
                '使用 Markdown 编写文档…\n支持 # 标题、- 列表、- [ ] 任务、表格、代码块等',
            }}
            style={{ borderRadius: 8 }}
          />
        </Box>
      </Box>
    </Box>
  );
}

/** 构建文档 HTML（打印/PDF 用） */
function buildDocHtml(title: string, markdown: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = markdown.split('\n');
  const body = lines
    .map((line) => {
      if (/^#{1,6}\s+/.test(line)) {
        const level = line.match(/^#{1,6}/)![0].length;
        const text = esc(line.replace(/^#{1,6}\s+/, ''));
        return `<h${level}>${text}</h${level}>`;
      }
      if (/^\s*[-*]\s+/.test(line)) return `<li>${esc(line.replace(/^\s*[-*]\s+/, ''))}</li>`;
      if (/^\s*\d+\.\s+/.test(line)) return `<li>${esc(line.replace(/^\s*\d+\.\s+/, ''))}</li>`;
      if (/^>/.test(line)) return `<blockquote>${esc(line.replace(/^>\s?/, ''))}</blockquote>`;
      if (/^```/.test(line)) return `<pre>`;
      if (line.trim() === '') return '';
      return `<p>${esc(line)}</p>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>${esc(title)}</title>
<style>
  body { font-family: "Microsoft YaHei","PingFang SC",sans-serif; max-width: 860px; margin: 0 auto; padding: 32px 24px; color: #1f2937; line-height: 1.8; }
  h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
  h2, h3 { margin-top: 1.2em; }
  li { margin: 4px 0; }
  pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 4px solid #4f46e5; margin: 8px 0; padding-left: 12px; color: #6b7280; }
</style>
</head>
<body><h1>${esc(title)}</h1>${body}</body></html>`;
}

/** 下载 Blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

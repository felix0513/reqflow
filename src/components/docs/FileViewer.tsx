import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import * as XLSX from 'xlsx';
import { copyText, docLink, fileLink } from '@/services/links';
import { downloadBlobFile } from '@/services/filedb';
import { parseEml, type ParsedEml } from '@/services/eml';
import { useToast } from '@/hooks/useToast';
import type { Doc, FileItem } from '@/types';

export type ViewerTarget =
  | { kind: 'file'; file: FileItem }
  | { kind: 'doc'; doc: Doc };

interface FileViewerProps {
  open: boolean;
  target: ViewerTarget | null;
  onClose: () => void;
}

/** 支持预览的格式分类 */
type PreviewKind =
  | 'sheet' // xlsx / xls / csv
  | 'docx'
  | 'pptx' // PowerPoint（提取幻灯片文本）
  | 'binText' // 老版 doc / ppt 二进制（尽力提取文本）
  | 'pdf'
  | 'html' // html / htm / xhtml
  | 'text' // 各类纯文本（代码/配置/日志/数据等）
  | 'image'
  | 'audio' // mp3 / wav / m4a / oga …
  | 'video' // mp4 / webm / ogg …
  | 'markdown'
  | 'eml'
  | 'unsupported';

/**
 * 可按纯文本预览的扩展名集合
 * 覆盖 Windows / macOS / Ubuntu 常见文本格式：
 * - 代码：js/ts/py/go/rs/java/c/cpp/cs/php/swift/kt/ruby/lua/vue/svelte…
 * - 脚本：sh/bash/zsh/bat/cmd/ps1…
 * - 配置：json/xml/yaml/toml/ini/cfg/conf/properties/env/gradle/cmake…
 * - 样式：css/scss/sass/less
 * - 文档：md/rst/adoc/tex/org/wiki
 * - 数据/日志：log/tsv/sql/srt/vtt/ics/vcf…
 * - 无扩展名常见文件：Makefile/Dockerfile/.gitignore 等（ext 取整个文件名小写）
 */
const TEXT_EXTS = new Set([
  // 通用文本
  'txt', 'text', 'log', 'nfo', 'strings',
  // Web / 标记
  'json', 'jsonc', 'json5', 'geojson', 'xml', 'xhtml', 'yaml', 'yml', 'toml',
  'ini', 'cfg', 'conf', 'config', 'properties', 'env', 'editorconfig',
  'plist', 'lock', 'localized',
  // 前端 / 代码
  'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'vue', 'svelte', 'astro',
  'css', 'scss', 'sass', 'less', 'styl',
  'html_partial', 'ejs', 'hbs', 'pug', 'twig',
  // 编程语言
  'py', 'pyw', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'scala', 'dart',
  'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'cs', 'fs', 'fsi', 'vb',
  'php', 'swift', 'm', 'mm', 'lua', 'pl', 'pm', 'r', 'jl', 'ex', 'exs',
  'dart', 'groovy', 'gradle', 'clj', 'erl', 'hs', 'elm', 'nim', 'zig', 'v',
  'sql', 'graphql', 'gql', 'prisma',
  // Shell / 脚本（Windows / macOS / Ubuntu）
  'sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'bat', 'cmd', 'ps1', 'psm1', 'psd1',
  'awk', 'sed', 'mk', 'cmake', 'make',
  // 文档 / 笔记
  'rst', 'adoc', 'asciidoc', 'tex', 'bib', 'org', 'wiki', 'creole', 'mdx',
  'rtf', 'eps', 'sv',
  // 数据 / 字幕 / 日历 / 联系人
  'tsv', 'ndjson', 'srt', 'vtt', 'ass', 'ssa', 'ics', 'vcf', 'ldif',
  'diff', 'patch', 'gitattributes',
  // 无扩展名常见文件（ext = 文件名小写）
  'makefile', 'dockerfile', 'containerfile', 'license', 'licence', 'readme',
  'changelog', 'authors', 'notice', 'contributing', 'codeowners',
  'gitignore', 'gitkeep', 'npmrc', 'yarnrc', 'babelrc', 'eslintrc',
  'prettierrc', 'nvmrc', 'rvmrc', 'gemfile', 'procfile', 'bashrc', 'zshrc',
  'bash_profile', 'profile', 'vimrc', 'screenrc',
]);

function previewKindOf(ext: string): PreviewKind {
  const e = (ext || '').toLowerCase();
  switch (e) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return 'sheet';
    case 'docx':
      return 'docx';
    case 'pptx':
    case 'ppsx':
      return 'pptx';
    case 'doc':
    case 'ppt':
    case 'pps':
      return 'binText';
    case 'pdf':
      return 'pdf';
    case 'html':
    case 'htm':
    case 'xhtml':
      return 'html';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'ico':
    case 'avif':
    case 'tiff':
    case 'tif':
    case 'heic':
    case 'heif':
      return 'image';
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'oga':
    case 'aac':
    case 'flac':
    case 'opus':
    case 'mid':
    case 'midi':
      return 'audio';
    case 'mp4':
    case 'webm':
    case 'ogg':
    case 'ogv':
    case 'mov':
    case 'mkv':
    case 'avi':
      return 'video';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'eml':
    case 'mht':
    case 'mhtml':
      return 'eml';
    default:
      return TEXT_EXTS.has(e) ? 'text' : 'unsupported';
  }
}

/** 人类可读文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 文档预览器：支持 Excel/CSV 表格、Word(docx)、PDF、HTML、Markdown、图片、纯文本
 * 二进制内容从 IndexedDB 按需加载
 */
export function FileViewer({ open, target, onClose }: FileViewerProps) {
  const toast = useToast();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetRows, setSheetRows] = useState<string[][] | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [emlData, setEmlData] = useState<ParsedEml | null>(null);
  const [pptxSlides, setPptxSlides] = useState<{ slide: number; text: string }[] | null>(null);
  const [binText, setBinText] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const isFile = target?.kind === 'file';
  const file = isFile ? (target as { file: FileItem }).file : null;
  const doc = target?.kind === 'doc' ? target.doc : null;
  const kind = file ? previewKindOf(file.ext) : 'markdown';
  const link = useMemo(
    () => (file ? fileLink(file.id) : doc ? docLink(doc.id) : ''),
    [file, doc],
  );

  // 加载内容
  useEffect(() => {
    if (!open || !target) return;
    const seq = ++loadSeq.current;
    setBlob(null);
    setSheetRows(null);
    setDocxHtml(null);
    setTextContent(null);
    setBlobUrl(null);
    setEmlData(null);
    setPptxSlides(null);
    setBinText(null);

    if (target.kind === 'doc') return; // Markdown 文档：内容已在元数据中

    const f = target.file;
    setLoading(true);

    (async () => {
      try {
        // 动态取 blob（通过全局避免循环依赖：直接引 filedb）
        const { getBlob } = await import('@/services/filedb');
        const b = await getBlob(f.id);
        if (seq !== loadSeq.current) return;
        if (!b) throw new Error('文件内容不存在（可能已被清理）');
        setBlob(b);

        switch (previewKindOf(f.ext)) {
          case 'sheet': {
            const buf = await b.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
              header: 1,
              raw: false,
              defval: '',
            });
            if (seq === loadSeq.current) setSheetRows(rows.slice(0, 500));
            break;
          }
          case 'docx': {
            const mammoth = await import('mammoth');
            const arrayBuffer = await b.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (seq === loadSeq.current) setDocxHtml(result.value);
            break;
          }
          case 'pptx': {
            const { extractPptxText } = await import('@/services/ooxml');
            const slides = await extractPptxText(await b.arrayBuffer());
            if (seq === loadSeq.current) setPptxSlides(slides);
            break;
          }
          case 'binText': {
            const { extractLegacyBinaryText } = await import('@/services/ooxml');
            const text = extractLegacyBinaryText(await b.arrayBuffer());
            if (seq === loadSeq.current) setBinText(text);
            break;
          }
          case 'pdf':
          case 'html':
          case 'image':
          case 'audio':
          case 'video': {
            const url = URL.createObjectURL(b);
            if (seq === loadSeq.current) setBlobUrl(url);
            break;
          }
          case 'markdown':
          case 'text': {
            const text = await b.text();
            if (seq === loadSeq.current) setTextContent(text);
            break;
          }
          case 'eml': {
            const raw = await b.text();
            const parsed = parseEml(raw);
            if (seq !== loadSeq.current) break;
            setEmlData(parsed);
            if (parsed.htmlBody) {
              const url = URL.createObjectURL(
                new Blob([parsed.htmlBody], { type: 'text/html' }),
              );
              if (seq === loadSeq.current) setBlobUrl(url);
            }
            break;
          }
          default:
            break;
        }
      } catch (e) {
        if (seq === loadSeq.current) {
          toast.error(e instanceof Error ? e.message : '文件加载失败');
        }
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    })();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.kind, file?.id, doc?.id]);

  const title = file ? file.name : doc ? doc.title : '';

  const handleCopyLink = async () => {
    const ok = await copyText(link);
    if (ok) toast.success('链接已复制，可粘贴到需求描述或文档中关联');
    else toast.error('复制失败');
  };

  const handleDownload = () => {
    if (!blob || !file) return;
    downloadBlobFile(blob, file.name);
  };

  const renderBody = () => {
    if (loading) {
      return (
        <Box className="flex h-64 items-center justify-center">
          <CircularProgress size={32} />
        </Box>
      );
    }

    if (doc) {
      // Markdown 文档预览（简单渲染：代码块/标题/列表）
      return (
        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.8,
            m: 0,
            color: 'text.primary',
          }}
        >
          {doc.content || '（空文档）'}
        </Box>
      );
    }

    if (!file) return null;

    switch (kind) {
      case 'sheet':
        return sheetRows ? (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: '65vh' }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {sheetRows[0]?.map((cell, i) => (
                    <TableCell key={i} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sheetRows.slice(1).map((row, ri) => (
                  <TableRow key={ri}>
                    {row.map((cell, ci) => (
                      <TableCell key={ci} sx={{ whiteSpace: 'nowrap', maxWidth: 320 }}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">表格解析中…</Typography>
        );

      case 'docx':
        return docxHtml ? (
          <Box
            dangerouslySetInnerHTML={{ __html: docxHtml }}
            sx={{
              '& table': { borderCollapse: 'collapse', width: '100%' },
              '& td, & th': { border: '1px solid #e5e7eb', p: 0.5, fontSize: 13 },
              '& img': { maxWidth: '100%' },
              fontSize: 14,
              lineHeight: 1.8,
            }}
          />
        ) : (
          <Typography color="text.secondary">文档解析中…</Typography>
        );

      case 'pdf':
        return blobUrl ? (
          <Box
            component="iframe"
            src={blobUrl}
            sx={{ width: '100%', height: '70vh', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          />
        ) : null;

      case 'html':
        return blobUrl ? (
          <Box
            component="iframe"
            src={blobUrl}
            sandbox="allow-same-origin"
            sx={{ width: '100%', height: '70vh', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
          />
        ) : null;

      case 'image':
        return blobUrl ? (
          <Box
            component="img"
            src={blobUrl}
            sx={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 1, display: 'block', mx: 'auto' }}
          />
        ) : null;

      case 'audio':
        return blobUrl ? (
          <Box className="flex flex-col items-center justify-center gap-3" sx={{ py: 6 }}>
            <Typography color="text.secondary" variant="body2">
              {file.name}
            </Typography>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={blobUrl} style={{ width: '100%', maxWidth: 560 }} />
          </Box>
        ) : null;

      case 'video':
        return blobUrl ? (
          <Box className="flex items-center justify-center">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              controls
              src={blobUrl}
              style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 8, background: '#000' }}
            />
          </Box>
        ) : null;

      case 'pptx':
        return pptxSlides ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              已提取 {pptxSlides.length} 页幻灯片文本内容
            </Typography>
            {pptxSlides.map((s) => (
              <Box key={s.slide} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main' }}>
                  第 {s.slide} 页
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 13,
                    lineHeight: 1.7,
                    m: 0,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                  }}
                >
                  {s.text}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">幻灯片解析中…</Typography>
        );

      case 'binText':
        return binText !== null ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              旧版 Office 二进制格式（.{file.ext}），已尽力提取可读文本
            </Typography>
            <Box
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13,
                lineHeight: 1.7,
                m: 0,
                maxHeight: '65vh',
                overflowY: 'auto',
              }}
            >
              {binText || '（未提取到可读文本，请下载后使用 Office 打开）'}
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary">文本提取中…</Typography>
        );

      case 'markdown':
      case 'text':
        return (
          <Box
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 13,
              lineHeight: 1.7,
              m: 0,
              maxHeight: '65vh',
              overflowY: 'auto',
            }}
          >
            {textContent ?? '（空文件）'}
          </Box>
        );

      case 'eml':
        return emlData ? (
          <Box>
            {/* 邮件头 */}
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 1.5,
                mb: 1.5,
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {emlData.headers.subject}
              </Typography>
              {[
                ['发件人', emlData.headers.from],
                ['收件人', emlData.headers.to],
                ['抄送', emlData.headers.cc],
                ['日期', emlData.headers.date],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <Typography key={k} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    <Box component="span" sx={{ fontWeight: 600, display: 'inline-block', width: 52 }}>
                      {k}
                    </Box>
                    {v}
                  </Typography>
                ))}
            </Box>
            {/* 正文：优先 HTML，其次纯文本 */}
            {blobUrl ? (
              <Box
                component="iframe"
                src={blobUrl}
                sandbox="allow-same-origin"
                sx={{ width: '100%', height: '58vh', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
              />
            ) : (
              <Box
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 13,
                  lineHeight: 1.7,
                  m: 0,
                  maxHeight: '58vh',
                  overflowY: 'auto',
                }}
              >
                {emlData.textBody ?? '（无正文）'}
              </Box>
            )}
          </Box>
        ) : (
          <Typography color="text.secondary">邮件解析中…</Typography>
        );

      default:
        return (
          <Box className="flex h-48 flex-col items-center justify-center gap-2">
            <Typography color="text.secondary">
              该格式（.{file.ext}）暂不支持在线预览
            </Typography>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
              下载到本地查看
            </Button>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '82vh' } }}
    >
      <DialogTitle className="flex items-center gap-2" sx={{ pr: 8 }}>
        <Typography variant="subtitle1" component="span" noWrap sx={{ fontWeight: 700, flex: 1 }}>
          {title}
        </Typography>
        {file && (
          <Typography variant="caption" color="text.secondary">
            {formatSize(file.size)} · {file.ext.toUpperCase()}
          </Typography>
        )}
        <Tooltip title="复制链接，可粘贴到需求描述或文档中">
          <IconButton size="small" onClick={handleCopyLink}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {file && blob && (
          <Tooltip title="下载">
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ overflowY: 'auto' }}>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}

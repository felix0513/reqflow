/**
 * 需求导出服务：支持 Markdown / HTML / Excel / CSV / PDF 五种格式
 * - Markdown: 模板字符串 + Blob 下载
 * - HTML: 内联样式可打印报告
 * - Excel: SheetJS (xlsx)
 * - CSV: 纯文本逗号分隔
 * - PDF: Electron 桌面端走 printToPDF（中文完美）；浏览器 fallback 打开打印对话框
 *
 * 所有导出均包含项目名称和需求版本信息
 */
import * as XLSX from 'xlsx';
import type { Requirement, Category, Project } from '@/types';
import { PRIORITY_META, STATUS_META } from '@/constants';

/** 导出上下文：需求列表 + 分类映射 + 项目信息 + 可选的标题 */
export interface ExportContext {
  requirements: Requirement[];
  categories: Category[];
  project?: Project | null;
  title?: string;
  /** 自定义文件名前缀（单条导出时用需求 ID 号） */
  filePrefix?: string;
  /** 精确文件名（不含扩展名）；设置后忽略前缀与时间戳 */
  fileName?: string;
}

/** 触发浏览器下载 Blob */
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

/** 生成带时间戳的文件名 */
export function stampedFileName(prefix: string, ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}_${ts}.${ext}`;
}

/** 解析最终文件名：精确名优先，否则 前缀_时间戳 */
function resolveFileName(ctx: ExportContext, ext: string): string {
  if (ctx.fileName) return `${ctx.fileName}.${ext}`;
  return stampedFileName(buildFilePrefix(ctx), ext);
}

/** 需求行数据 -> 可读文本行（供 MD/HTML 共用） */
function toRowText(
  r: Requirement,
  categories: Category[],
  index: number,
): { title: string; meta: string[]; description: string } {
  const cat = categories.find((c) => c.id === r.categoryId);
  const meta = [
    `ID：${r.code}`,
    `优先级：${PRIORITY_META[r.priority].label}`,
    `状态：${STATUS_META[r.status].label}`,
    `分类：${cat?.name ?? '未分类'}`,
    `版本：v${r.version}`,
    r.dueDate ? `截止：${r.dueDate}` : '截止：无',
    `创建者：${r.creator || '（空）'}`,
    `跟进者：${r.owner || '（空）'}`,
  ];
  if (r.tags.length > 0) meta.push(`标签：${r.tags.join(', ')}`);
  if (r.attachments && r.attachments.length > 0) {
    meta.push(`附件：${r.attachments.map((a) => a.name).join(', ')}`);
  }
  return {
    title: `${index}. ${r.title}`,
    meta,
    description: r.description?.trim() ? r.description : '（无描述）',
  };
}

/** 构建导出标题（含项目名） */
function buildTitle(ctx: ExportContext): string {
  const projectName = ctx.project?.name ?? '全部项目';
  return ctx.title ?? `${projectName} - 需求清单`;
}

/** 构建导出文件名前缀（含项目名） */
function buildFilePrefix(ctx: ExportContext): string {
  return ctx.filePrefix ?? ctx.project?.name ?? 'requirements';
}

/** —— Markdown 导出 —— */
export function exportToMarkdown(ctx: ExportContext): void {
  const lines: string[] = [];
  const title = buildTitle(ctx);
  lines.push(`# ${title}`);
  lines.push('');
  const metaInfo = [
    `导出时间：${new Date().toLocaleString('zh-CN')}`,
    `项目：${ctx.project?.name ?? '全部项目'}`,
    `需求数量：${ctx.requirements.length} 条`,
  ];
  lines.push(`> ${metaInfo.join('  ·  ')}`);
  lines.push('');

  ctx.requirements.forEach((r, i) => {
    const row = toRowText(r, ctx.categories, i + 1);
    lines.push(`## ${row.title}`);
    lines.push('');
    lines.push(`- ${row.meta.join('  \n- ')}`);
    lines.push('');
    lines.push(row.description);
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], {
    type: 'text/markdown;charset=utf-8',
  });
  downloadBlob(blob, resolveFileName(ctx, 'md'));
}

/** —— HTML 导出（内联样式，可直接打印）—— */
export function exportToHtml(ctx: ExportContext): void {
  const title = buildTitle(ctx);
  const rows = ctx.requirements
    .map((r, i) => {
      const row = toRowText(r, ctx.categories, i + 1);
      return `
        <section class="req">
          <h2>${escapeHtml(row.title)}</h2>
          <ul class="meta">${row.meta.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
          <p class="desc">${escapeHtml(row.description)}</p>
        </section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; max-width: 900px; margin: 0 auto; padding: 32px 24px; color: #1f2937; line-height: 1.7; }
  h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 8px; color: #111827; }
  .export-meta { color: #6b7280; font-size: 14px; }
  .req { margin: 24px 0; padding: 16px 20px; border: 1px solid #e5e7eb; border-radius: 8px; break-inside: avoid; }
  .req h2 { margin: 0 0 8px; font-size: 17px; color: #4f46e5; }
  .req .meta { list-style: none; padding: 0; margin: 0 0 8px; display: flex; flex-wrap: wrap; gap: 8px; }
  .req .meta li { background: #f3f4f6; border-radius: 4px; padding: 2px 8px; font-size: 12px; color: #374151; }
  .req .desc { margin: 0; white-space: pre-wrap; color: #374151; }
  @media print { .req { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="export-meta">导出时间：${new Date().toLocaleString('zh-CN')} · 项目：${escapeHtml(ctx.project?.name ?? '全部项目')} · 共 ${ctx.requirements.length} 条</p>
  ${rows}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, resolveFileName(ctx, 'html'));
}

/** —— Excel 导出 —— */
export function exportToExcel(ctx: ExportContext): void {
  const data = ctx.requirements.map((r) => {
    const cat = ctx.categories.find((c) => c.id === r.categoryId);
    return {
      ID: r.code,
      标题: r.title,
      版本: `v${r.version}`,
      优先级: PRIORITY_META[r.priority].label,
      状态: STATUS_META[r.status].label,
      分类: cat?.name ?? '未分类',
      标签: r.tags.join(', '),
      截止日期: r.dueDate ?? '',
      创建者: r.creator ?? '',
      跟进者: r.owner ?? '',
      附件: (r.attachments ?? []).map((a) => a.name).join(', '),
      描述: r.description,
      创建时间: new Date(r.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(r.updatedAt).toLocaleString('zh-CN'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '需求列表');
  XLSX.writeFile(wb, resolveFileName(ctx, 'xlsx'));
}

/** —— CSV 导出 —— */
export function exportToCsv(ctx: ExportContext): void {
  const headers = [
    'ID',
    '标题',
    '版本',
    '优先级',
    '状态',
    '分类',
    '标签',
    '截止日期',
    '创建者',
    '跟进者',
    '附件',
    '描述',
    '创建时间',
    '更新时间',
  ];

  const rows = ctx.requirements.map((r) => {
    const cat = ctx.categories.find((c) => c.id === r.categoryId);
    return [
      r.code,
      r.title,
      `v${r.version}`,
      PRIORITY_META[r.priority].label,
      STATUS_META[r.status].label,
      cat?.name ?? '未分类',
      r.tags.join(', '),
      r.dueDate ?? '',
      r.creator ?? '',
      r.owner ?? '',
      (r.attachments ?? []).map((a) => a.name).join(', '),
      r.description,
      new Date(r.createdAt).toLocaleString('zh-CN'),
      new Date(r.updatedAt).toLocaleString('zh-CN'),
    ];
  });

  // CSV 转义：含逗号、引号、换行的字段用双引号包裹，内部双引号转义为两个双引号
  const escapeCsv = (val: string): string => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];

  // 添加 BOM 以确保 Excel 正确识别 UTF-8 编码
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, resolveFileName(ctx, 'csv'));
}

/** —— PDF 导出 —— */
export async function exportToPdf(ctx: ExportContext): Promise<void> {
  const html = buildPrintableHtml(ctx);
  const win = window as unknown as { reqflow?: { exportPdf?: (html: string) => Promise<{ ok: boolean; error?: string }> } };

  // Electron 桌面端：走主进程 printToPDF，中文渲染最佳
  if (win.reqflow?.exportPdf) {
    const result = await win.reqflow.exportPdf(html);
    if (!result.ok) throw new Error(result.error ?? 'PDF 导出失败');
    return;
  }

  // 浏览器 fallback：打开打印对话框，用户选择"另存为 PDF"
  openPrintWindow(html);
}

/** 构建可打印 HTML（Electron 打印窗口与浏览器打印共用） */
function buildPrintableHtml(ctx: ExportContext): string {
  const title = buildTitle(ctx);
  const rows = ctx.requirements
    .map((r, i) => {
      const row = toRowText(r, ctx.categories, i + 1);
      return `
        <section class="req">
          <h2>${escapeHtml(row.title)}</h2>
          <ul class="meta">${row.meta.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
          <p class="desc">${escapeHtml(row.description)}</p>
        </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; max-width: 900px; margin: 0 auto; padding: 32px 24px; color: #1f2937; line-height: 1.7; }
  h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 8px; color: #111827; }
  .export-meta { color: #6b7280; font-size: 14px; }
  .req { margin: 24px 0; padding: 16px 20px; border: 1px solid #e5e7eb; border-radius: 8px; break-inside: avoid; }
  .req h2 { margin: 0 0 8px; font-size: 17px; color: #4f46e5; }
  .req .meta { list-style: none; padding: 0; margin: 0 0 8px; display: flex; flex-wrap: wrap; gap: 8px; }
  .req .meta li { background: #f3f4f6; border-radius: 4px; padding: 2px 8px; font-size: 12px; color: #374151; }
  .req .desc { margin: 0; white-space: pre-wrap; color: #374151; }
  @media print { .req { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="export-meta">导出时间：${new Date().toLocaleString('zh-CN')} · 项目：${escapeHtml(ctx.project?.name ?? '全部项目')} · 共 ${ctx.requirements.length} 条</p>
  ${rows}
</body>
</html>`;
}

/** 打开新窗口打印（浏览器 PDF fallback） */
function openPrintWindow(html: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    // 弹窗被拦截时退化为下载 HTML
    exportToHtml({ requirements: [], categories: [] });
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

/** HTML 转义，防注入 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 导出格式类型 */
export type ExportFormat = 'excel' | 'csv' | 'markdown' | 'html' | 'pdf';

/**
 * 导出单条需求为指定格式
 * 文件名以需求 ID 号为前缀，标题包含 ID 与版本号
 */
export function exportSingleRequirement(
  format: ExportFormat,
  req: Requirement,
  categories: Category[],
  project?: Project | null,
): Promise<void> | void {
  const ctx: ExportContext = {
    requirements: [req],
    categories,
    project,
    title: `${req.code} · ${req.title}（v${req.version}）`,
    filePrefix: req.code,
  };
  switch (format) {
    case 'excel':
      return exportToExcel(ctx);
    case 'csv':
      return exportToCsv(ctx);
    case 'markdown':
      return exportToMarkdown(ctx);
    case 'html':
      return exportToHtml(ctx);
    case 'pdf':
      return exportToPdf(ctx);
  }
}

/** 文件名非法字符替换为下划线 */
function sanitizeFileNamePart(s: string): string {
  return (s || '').replace(/[\\/:*?"<>|\r\n]+/g, '_').trim() || '未命名';
}

/** 今日日期 'YYYYMMDD' */
function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * 批量导出：将选中的多条需求导出为一个需求文档
 * 文件命名格式：项目名_分类_版本号_日期（如 需求管理系统_功能_v1.0.0~v2.3.1_20260816）
 * - 分类：单一分类用分类名，多分类用「首分类等N类」
 * - 版本号：单一版本用 v{version}，多版本用 v{最小}~v{最大}
 */
export function exportRequirementsBatch(
  format: ExportFormat,
  reqs: Requirement[],
  categories: Category[],
  project?: Project | null,
): Promise<void> | void {
  if (reqs.length === 0) return;

  // 分类段
  const catNames = Array.from(
    new Set(
      reqs.map((r) => categories.find((c) => c.id === r.categoryId)?.name ?? '未分类'),
    ),
  );
  const catPart =
    catNames.length === 1 ? catNames[0] : `${catNames[0]}等${catNames.length}类`;

  // 版本段
  const versions = Array.from(new Set(reqs.map((r) => r.version))).sort(
    (a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      return (
        (pa[0] || 0) - (pb[0] || 0) ||
        (pa[1] || 0) - (pb[1] || 0) ||
        (pa[2] || 0) - (pb[2] || 0)
      );
    },
  );
  const verPart =
    versions.length === 1
      ? `v${versions[0]}`
      : `v${versions[0]}~v${versions[versions.length - 1]}`;

  const fileName = [
    sanitizeFileNamePart(project?.name ?? '全部项目'),
    sanitizeFileNamePart(catPart),
    sanitizeFileNamePart(verPart),
    dateStamp(),
  ].join('_');

  const ctx: ExportContext = {
    requirements: reqs,
    categories,
    project,
    fileName,
  };
  switch (format) {
    case 'excel':
      return exportToExcel(ctx);
    case 'csv':
      return exportToCsv(ctx);
    case 'markdown':
      return exportToMarkdown(ctx);
    case 'html':
      return exportToHtml(ctx);
    case 'pdf':
      return exportToPdf(ctx);
  }
}

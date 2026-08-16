/**
 * 项目状态报告服务：按项目汇总需求状态，支持导出 Markdown / HTML / PDF
 */
import type { Project, Requirement, Status, Priority } from '@/types';
import { STATUS_LIST, PRIORITY_LIST } from '@/constants';

/** 单个项目的状态汇总 */
export interface ProjectStatusSummary {
  project: Project;
  total: number;
  statusCounts: Record<Status, number>;
  priorityCounts: Record<Priority, number>;
  overdue: number;
  /** 完成率（done+closed 占比，0-100） */
  completionRate: number;
}

/** 判断需求是否逾期（与 constants/format 一致，避免循环依赖此处内联实现） */
function overdueOf(r: Requirement): boolean {
  if (!r.dueDate) return false;
  if (r.status === 'done' || r.status === 'closed') return false;
  return r.dueDate < new Date().toISOString().slice(0, 10);
}

/** 汇总所有项目的状态 */
export function summarizeProjects(
  projects: Project[],
  requirements: Requirement[],
): ProjectStatusSummary[] {
  return projects.map((project) => {
    const reqs = requirements.filter((r) => r.projectId === project.id);
    const statusCounts = {} as Record<Status, number>;
    STATUS_LIST.forEach((s) => {
      statusCounts[s.key as Status] = reqs.filter((r) => r.status === s.key).length;
    });
    const priorityCounts = {} as Record<Priority, number>;
    PRIORITY_LIST.forEach((p) => {
      priorityCounts[p.key as Priority] = reqs.filter((r) => r.priority === p.key).length;
    });
    const done = statusCounts.done + statusCounts.closed;
    return {
      project,
      total: reqs.length,
      statusCounts,
      priorityCounts,
      overdue: reqs.filter(overdueOf).length,
      completionRate: reqs.length === 0 ? 0 : Math.round((done / reqs.length) * 100),
    };
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** 构建 Markdown 报告 */
export function buildStatusReportMarkdown(summaries: ProjectStatusSummary[]): string {
  const lines: string[] = ['# 所有项目状态报告', ''];
  lines.push(`> 生成时间：${new Date().toLocaleString('zh-CN')} · 共 ${summaries.length} 个项目`);
  lines.push('');
  summaries.forEach((s) => {
    lines.push(`## ${s.project.name}`);
    lines.push('');
    lines.push(`- 需求总数：${s.total}`);
    lines.push(
      `- 状态分布：${STATUS_LIST.map((st) => `${st.label} ${s.statusCounts[st.key as Status]}`).join(' · ')}`,
    );
    lines.push(
      `- 优先级分布：${PRIORITY_LIST.map((p) => `${p.key} ${s.priorityCounts[p.key as Priority]}`).join(' · ')}`,
    );
    lines.push(`- 逾期：${s.overdue} 条`);
    lines.push(`- 完成率：${s.completionRate}%`);
    lines.push('');
  });
  return lines.join('\n');
}

/** 构建 HTML 报告（内联样式，可打印） */
export function buildStatusReportHtml(summaries: ProjectStatusSummary[]): string {
  const blocks = summaries
    .map((s) => {
      const statusChips = STATUS_LIST.map((st) => {
        const v = s.statusCounts[st.key as Status];
        return `<span class="chip">${esc(st.label)} <b>${v}</b></span>`;
      }).join('');
      const prioChips = PRIORITY_LIST.map((p) => {
        const v = s.priorityCounts[p.key as Priority];
        return `<span class="chip">${esc(p.key)} <b>${v}</b></span>`;
      }).join('');
      return `
      <section class="proj">
        <h2><span class="dot" style="background:${esc(s.project.color)}"></span>${esc(s.project.name)}</h2>
        <div class="stats">
          <div class="stat"><span>需求总数</span><b>${s.total}</b></div>
          <div class="stat"><span>逾期</span><b style="color:${s.overdue > 0 ? '#ef4444' : '#22c55e'}">${s.overdue}</b></div>
          <div class="stat"><span>完成率</span><b>${s.completionRate}%</b></div>
        </div>
        <p class="lbl">状态分布</p>
        <div class="chips">${statusChips}</div>
        <p class="lbl">优先级分布</p>
        <div class="chips">${prioChips}</div>
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>所有项目状态报告</title>
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; max-width: 960px; margin: 0 auto; padding: 32px 24px; color: #1f2937; line-height: 1.7; }
  h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
  .meta { color: #6b7280; font-size: 14px; }
  .proj { margin: 24px 0; padding: 16px 20px; border: 1px solid #e5e7eb; border-radius: 10px; break-inside: avoid; }
  .proj h2 { margin: 0 0 12px; font-size: 18px; display: flex; align-items: center; gap: 8px; }
  .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
  .stats { display: flex; gap: 24px; margin-bottom: 10px; }
  .stat span { color: #6b7280; font-size: 13px; margin-right: 6px; }
  .stat b { font-size: 18px; }
  .lbl { margin: 8px 0 4px; color: #6b7280; font-size: 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: #f3f4f6; border-radius: 6px; padding: 2px 10px; font-size: 12px; color: #374151; }
  .chip b { color: #111827; }
  @media print { .proj { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>所有项目状态报告</h1>
  <p class="meta">生成时间：${new Date().toLocaleString('zh-CN')} · 共 ${summaries.length} 个项目</p>
  ${blocks}
</body>
</html>`;
}

export type StatusReportFormat = 'markdown' | 'html' | 'pdf';

/** 导出项目状态报告 */
export async function exportStatusReport(
  format: StatusReportFormat,
  summaries: ProjectStatusSummary[],
): Promise<void> {
  const baseName = `项目状态报告_${dateStamp()}`;
  if (format === 'markdown') {
    const md = buildStatusReportMarkdown(summaries);
    downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${baseName}.md`);
    return;
  }
  const html = buildStatusReportHtml(summaries);
  if (format === 'html') {
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${baseName}.html`);
    return;
  }
  // PDF：Electron 走主进程 printToPDF，浏览器走打印对话框
  const win = window as unknown as {
    reqflow?: { exportPdf?: (html: string) => Promise<{ ok: boolean; error?: string }> };
  };
  if (win.reqflow?.exportPdf) {
    const result = await win.reqflow.exportPdf(html);
    if (!result.ok) throw new Error(result.error ?? 'PDF 导出失败');
    return;
  }
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${baseName}.html`);
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

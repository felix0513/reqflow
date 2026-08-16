/**
 * ReqFlow 内部链接协议
 *
 * 格式：
 *   reqflow://doc/{docId}    → 文档库文档（Markdown）
 *   reqflow://file/{fileId}  → 文档库上传文件
 *
 * 用途：任何文档/需求描述中粘贴此链接即可建立关联；
 * 应用内点击链接（全局拦截）即可打开对应文档预览。
 */

export const REQFLOW_LINK_PREFIX = 'reqflow://';

export type ReqflowLinkTarget =
  | { kind: 'doc'; id: string }
  | { kind: 'file'; id: string };

/** 构建文档链接 */
export function docLink(id: string): string {
  return `reqflow://doc/${id}`;
}

/** 构建文件链接 */
export function fileLink(id: string): string {
  return `reqflow://file/${id}`;
}

/** 解析 reqflow:// 链接，非本协议返回 null */
export function parseReqflowLink(url: string): ReqflowLinkTarget | null {
  const m = url.trim().match(/^reqflow:\/\/(doc|file)\/([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  return { kind: m[1] as 'doc' | 'file', id: m[2] };
}

/** 复制文本到剪贴板（带旧浏览器回退） */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 回退到传统方案
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

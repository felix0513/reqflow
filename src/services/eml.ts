/**
 * .eml 邮件文件解析（轻量 MIME 解析器）
 * 支持：头部字段（含折叠行）、RFC 2047 编码词、multipart 边界、
 * text/plain 与 text/html 正文、base64 / quoted-printable 传输编码、
 * 常见中文字符集（UTF-8 / GBK / GB2312 / Big5）
 */

export interface EmlHeaders {
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
}

export interface ParsedEml {
  headers: EmlHeaders;
  /** 纯文本正文（可能为 null） */
  textBody: string | null;
  /** HTML 正文（可能为 null） */
  htmlBody: string | null;
}

/** 解码 RFC 2047 编码词：=?charset?B?xxx?= / =?charset?Q?xxx?= */
function decodeEncodedWords(s: string): string {
  return s.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_, charset: string, enc: string, data: string) => {
      try {
        let bytes: Uint8Array;
        if (enc.toUpperCase() === 'B') {
          bytes = base64ToBytes(data.replace(/\s+/g, ''));
        } else {
          bytes = qpToBytes(data.replace(/_/g, ' '));
        }
        return decodeCharset(bytes, charset);
      } catch {
        return data;
      }
    },
  );
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** quoted-printable 字符串 → 字节 */
function qpToBytes(s: string): Uint8Array {
  const out: number[] = [];
  const soft = s.replace(/=\r?\n/g, '');
  for (let i = 0; i < soft.length; i++) {
    if (soft[i] === '=' && i + 2 < soft.length + 1 && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) {
      out.push(parseInt(soft.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(soft.charCodeAt(i));
    }
  }
  return new Uint8Array(out);
}

function decodeCharset(bytes: Uint8Array, charset: string): string {
  const cs = charset.toLowerCase();
  const normalized = cs.startsWith('gb') || cs === 'csgb2312' ? 'gbk' : cs;
  try {
    return new TextDecoder(normalized).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** 按传输编码解码正文字节 */
function decodeBody(body: string, encoding: string, charset: string): string {
  const enc = (encoding || '').trim().toLowerCase();
  const bytes =
    enc === 'base64'
      ? base64ToBytes(body.replace(/\s+/g, ''))
      : enc === 'quoted-printable'
        ? qpToBytes(body)
        : new TextEncoder().encode(body);
  return decodeCharset(bytes, charset || 'utf-8');
}

/** 解析头部块（含折叠行）为键值对 */
function parseHeaders(block: string): Record<string, string> {
  const map: Record<string, string> = {};
  let lastKey = '';
  block.split(/\r?\n/).forEach((line) => {
    if (/^[ \t]/.test(line) && lastKey) {
      // 折叠行：追加到上一个头
      map[lastKey] += ' ' + line.trim();
    } else {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim().toLowerCase();
        map[key] = line.slice(idx + 1).trim();
        lastKey = key;
      }
    }
  });
  return map;
}

/** 从 Content-Type 头提取 boundary */
function boundaryOf(contentType: string): string | null {
  const m = contentType.match(/boundary\s*=\s*"?([^";]+)"?/i);
  return m ? m[1] : null;
}

/** 从 Content-Type 头提取 charset */
function charsetOf(headers: Record<string, string>): string {
  const ct = headers['content-type'] ?? '';
  const m = ct.match(/charset\s*=\s*"?([^";]+)"?/i);
  return m ? m[1] : 'utf-8';
}

/** 递归提取 multipart 中优先 text/html，其次 text/plain 的正文 */
function extractBody(headers: Record<string, string>, body: string): { text: string | null; html: string | null } {
  const ct = (headers['content-type'] ?? 'text/plain').toLowerCase();
  const encoding = headers['content-transfer-encoding'] ?? '';
  const charset = charsetOf(headers);

  if (ct.startsWith('multipart/') || ct.startsWith('message/')) {
    const boundary = boundaryOf(headers['content-type'] ?? '');
    if (boundary) {
      const delim = `--${boundary}`;
      const sections = body.split(delim);
      let text: string | null = null;
      let html: string | null = null;
      for (const sec of sections) {
        const trimmed = sec.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
        if (!trimmed || trimmed === '--') continue;
        const sepIdx = trimmed.search(/\r?\n\r?\n/);
        if (sepIdx < 0) continue;
        const partHeaders = parseHeaders(trimmed.slice(0, sepIdx));
        const partBody = trimmed.slice(sepIdx).replace(/^\r?\n\r?\n/, '');
        const result = extractBody(partHeaders, partBody);
        if (result.html && !html) html = result.html;
        if (result.text && !text) text = result.text;
      }
      if (html || text) return { text, html };
    }
    // 无 boundary 或未提取到：按原文返回
    return { text: body, html: null };
  }

  const decoded = decodeBody(body, encoding, charset);
  if (ct.includes('text/html')) return { text: null, html: decoded };
  if (ct.startsWith('text/')) return { text: decoded, html: null };
  // 附件等其他类型：忽略
  return { text: null, html: null };
}

/** 解析 .eml 原始文本 */
export function parseEml(raw: string): ParsedEml {
  // 分离头部与正文
  const sepMatch = raw.match(/\r?\n\r?\n/);
  const headerBlock = sepMatch ? raw.slice(0, sepMatch.index) : raw;
  const bodyBlock = sepMatch ? raw.slice(sepMatch.index! + sepMatch[0].length) : '';

  const headers = parseHeaders(headerBlock);
  const { text, html } = extractBody(headers, bodyBlock);

  const fallbackText =
    text ?? html
      ? text
      : bodyBlock.trim() || null;

  return {
    headers: {
      from: decodeEncodedWords(headers.from ?? ''),
      to: decodeEncodedWords(headers.to ?? ''),
      cc: decodeEncodedWords(headers.cc ?? ''),
      subject: decodeEncodedWords(headers.subject ?? '（无主题）'),
      date: headers.date ?? '',
    },
    textBody: fallbackText,
    htmlBody: html,
  };
}

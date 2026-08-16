/**
 * Office 文档尽力预览解析
 *
 * - pptx：ZIP + OOXML 格式。用最小 ZIP 读取器解析出 ppt/slides/slideN.xml，
 *   再用浏览器原生 DecompressionStream('deflate-raw') 解压，剥离 XML 标签提取文本。
 * - doc / ppt（97-2003 老格式，OLE2 复合二进制）：无成熟浏览器端解析库，
 *   采用"strings 式"提取：扫描 UTF-16LE / ASCII 可打印字符序列。
 */

// ==================== 最小 ZIP 读取器 ====================

interface ZipEntry {
  name: string;
  compression: number; // 0 = stored, 8 = deflate
  compressedSize: number;
  localOffset: number;
}

/** 从 ZIP 文件尾解析中央目录条目 */
function readZipEntries(buf: ArrayBuffer): ZipEntry[] {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const decoder = new TextDecoder();

  // 1. 定位 EOCD（End of Central Directory，签名 0x06054b50）
  let eocd = -1;
  const scanStart = Math.max(0, u8.length - 66_000);
  for (let i = u8.length - 22; i >= scanStart; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('非有效的 ZIP 文件');

  const count = dv.getUint16(eocd + 10, true);
  let ptr = dv.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (dv.getUint32(ptr, true) !== 0x02014b50) break; // 中央目录文件头签名
    const compression = dv.getUint16(ptr + 10, true);
    const compressedSize = dv.getUint32(ptr + 20, true);
    const nameLen = dv.getUint16(ptr + 28, true);
    const extraLen = dv.getUint16(ptr + 30, true);
    const commentLen = dv.getUint16(ptr + 32, true);
    const localOffset = dv.getUint32(ptr + 42, true);
    const name = decoder.decode(u8.subarray(ptr + 46, ptr + 46 + nameLen));
    entries.push({ name, compression, compressedSize, localOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** 读取 ZIP 条目内容（Uint8Array） */
async function readZipEntry(
  buf: ArrayBuffer,
  entry: ZipEntry,
): Promise<Uint8Array> {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  if (dv.getUint32(entry.localOffset, true) !== 0x04034b50) {
    throw new Error('ZIP 本地文件头损坏');
  }
  const nameLen = dv.getUint16(entry.localOffset + 26, true);
  const extraLen = dv.getUint16(entry.localOffset + 28, true);
  const dataStart = entry.localOffset + 30 + nameLen + extraLen;
  const raw = u8.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === 0) return raw;
  if (entry.compression === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持 deflate 解压');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([raw]).stream().pipeThrough(ds);
    const out = await new Response(stream).arrayBuffer();
    return new Uint8Array(out);
  }
  throw new Error(`不支持的压缩方式：${entry.compression}`);
}

// ==================== PPTX 文本提取 ====================

/** 剥离 XML 标签，把 <a:t> 文本拼出来（保留段落换行） */
function xmlToText(xml: string): string {
  return xml
    .replace(/<a:p[\s>]/g, '\n') // 段落 → 换行
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => l !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');
}

/** 提取 pptx 每页幻灯片文本，返回 [ {slide, text} ] */
export async function extractPptxText(
  buf: ArrayBuffer,
): Promise<{ slide: number; text: string }[]> {
  const entries = readZipEntries(buf);
  const slides = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort(
      (a, b) =>
        parseInt(a.name.match(/(\d+)\.xml$/)![1], 10) -
        parseInt(b.name.match(/(\d+)\.xml$/)![1], 10),
    );
  if (slides.length === 0) throw new Error('未找到幻灯片内容');

  const result: { slide: number; text: string }[] = [];
  for (const s of slides) {
    const data = await readZipEntry(buf, s);
    const xml = new TextDecoder().decode(data);
    const text = xmlToText(xml).trim();
    const num = parseInt(s.name.match(/(\d+)\.xml$/)![1], 10);
    if (text) result.push({ slide: num, text });
  }
  if (result.length === 0) throw new Error('幻灯片无可提取文本');
  return result;
}

// ==================== 老版二进制 Office（doc/ppt）文本提取 ====================

/** 扫描 UTF-16LE 可打印序列（Word/PowerPoint 97-2003 正文主要存储方式） */
function scanUtf16(u8: Uint8Array): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  const isPrintable = (cp: number) =>
    (cp >= 0x20 && cp < 0x7f) || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3000 && cp <= 0x30ff) || (cp >= 0xff00 && cp <= 0xffef);
  for (let i = 0; i + 1 < u8.length; i += 2) {
    const cp = u8[i] | (u8[i + 1] << 8);
    if (cp !== 0 && cp !== 0x0d && cp !== 0x0a && isPrintable(cp)) {
      cur.push(String.fromCharCode(cp));
    } else if (cp === 0x0d || cp === 0x0a) {
      cur.push('\n');
    } else {
      if (cur.length >= 6) out.push(cur.join(''));
      cur = [];
    }
  }
  if (cur.length >= 6) out.push(cur.join(''));
  return out;
}

/** 扫描 ASCII 可打印序列（英文内容/元数据） */
function scanAscii(u8: Uint8Array): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < u8.length; i++) {
    const c = u8[i];
    if (c >= 0x20 && c < 0x7f) {
      cur += String.fromCharCode(c);
    } else {
      if (cur.length >= 8) out.push(cur);
      cur = '';
    }
  }
  if (cur.length >= 8) out.push(cur);
  return out;
}

/**
 * 老版 .doc/.ppt 二进制文本尽力提取
 * 策略：UTF-16LE 扫描结果若含 CJK 字符则优先；否则合并 ASCII 结果
 */
export function extractLegacyBinaryText(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  const utf16 = scanUtf16(u8);
  const hasCjk = utf16.some((s) => /[\u4e00-\u9fff]/.test(s));
  const lines = hasCjk
    ? utf16.filter((s) => /[\u4e00-\u9fff]/.test(s))
    : [...utf16, ...scanAscii(u8)];

  // 去重相邻重复行（OLE 结构常导致重复），限制输出长度
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
    if (result.length > 2000) break;
  }
  return result.join('\n');
}

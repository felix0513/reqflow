/**
 * 需求业务 ID 号生成服务
 *
 * ID 规则：REQ-{分类码}-{分类内序号}   例如 "REQ-FEA-0001"
 *
 * ┌──────────┬──────────────────────────────────────────────────────┐
 * │ 段        │ 说明                                                 │
 * ├──────────┼──────────────────────────────────────────────────────┤
 * │ REQ      │ 系统前缀，标识需求实体（Requirement）                 │
 * │ 分类码    │ 3 位大写字母分类缩写（FEA/BUG/OPT/OTH…），           │
 * │          │ 一眼区分任务类别；ID 创建后不可变，分类后续变更        │
 * │          │ 不影响已生成的 ID                                     │
 * │ 分类内序号│ 4 位零填充递增序号，每个分类码独立计数、从 0001 开始  │
 * │          │ （如第一条功能需求为 REQ-FEA-0001）                   │
 * └──────────┴──────────────────────────────────────────────────────┘
 *
 * 示例：REQ-FEA-0001（第 1 条功能类）/ REQ-BUG-0001（第 1 条缺陷类）
 *
 * 唯一性保证：
 * 1. 每个分类码一个独立计数器，持久化于 localStorage（JSON 映射）；
 * 2. ID 由「分类码 + 分类内序号」共同构成，不同分类之间天然不冲突，
 *    同分类内计数器严格递增，因此全系统（跨所有项目）永不冲突；
 * 3. 启动迁移时会扫描全部存量 code，将各分类计数器推到该分类最大序号之后；
 * 4. 导入的数据若与现有 code 冲突，启动迁移时自动重新分配。
 *
 * 兼容性：历史数据使用全局 5 位序号（如 REQ-FEA-00042），依然合法；
 * 新生成的 ID 使用 4 位序号（如 REQ-FEA-0001）。
 */

import type { Category, Requirement } from '@/types';
import { genId } from '@/constants/id';

/** 计数器映射存储键：{ 分类码: 序号 } */
const SEQ_KEY = 'reqflow_code_seqs';

/** 默认分类 → 分类码映射（固定 ID 的内置分类） */
const DEFAULT_CATEGORY_CODES: Record<string, string> = {
  'cat-feature': 'FEA',
  'cat-bug': 'BUG',
  'cat-optimization': 'OPT',
  'cat-other': 'OTH',
};

/** 自定义分类码 → 默认码（避免与内置码冲突） */
const RESERVED_CODES = new Set(Object.values(DEFAULT_CATEGORY_CODES));

/** 从分类名称派生 3 位分类码（取名称中的 ASCII 字母，不足补 X） */
function deriveCodeFromName(name: string, salt: number): string {
  const letters = (name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  // 中文名称（无 ASCII 字母）或与内置码冲突时，用 C + 序号
  const candidate = letters === 'XXX' || RESERVED_CODES.has(letters)
    ? `C${String(salt).padStart(2, '0')}`
    : letters;
  return candidate;
}

/**
 * 计算分类码
 * @param categoryId 分类 ID
 * @param categories 全部分类（用于查名称）
 */
export function categoryCode(categoryId: string, categories: Category[]): string {
  if (DEFAULT_CATEGORY_CODES[categoryId]) {
    return DEFAULT_CATEGORY_CODES[categoryId];
  }
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return 'GEN';
  const idx = categories.indexOf(cat) + 1;
  return deriveCodeFromName(cat.name, idx);
}

/** 读取全部分类计数器映射 */
export function loadSeqs(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** 写入全部分类计数器映射 */
export function saveSeqs(seqs: Record<string, number>): void {
  localStorage.setItem(SEQ_KEY, JSON.stringify(seqs));
}

/** 指定分类码的序号 +1（持久化） */
export function nextSeq(catCode: string): number {
  const seqs = loadSeqs();
  const seq = (seqs[catCode] ?? 0) + 1;
  seqs[catCode] = seq;
  saveSeqs(seqs);
  return seq;
}

/** 将指定分类码的计数器推到至少 seq（用于迁移，不回退已有值） */
export function ensureSeq(catCode: string, seq: number): void {
  const seqs = loadSeqs();
  if ((seqs[catCode] ?? 0) < seq) {
    seqs[catCode] = seq;
    saveSeqs(seqs);
  }
}

/**
 * 生成需求业务 ID：REQ-{分类码}-{4位分类内序号}
 */
export function genRequirementCode(categoryId: string, categories: Category[]): string {
  const code = categoryCode(categoryId, categories);
  const seq = nextSeq(code);
  return formatCode(code, seq);
}

/** 拼装 ID 字符串（4 位零填充，超长自动扩展） */
export function formatCode(catCode: string, seq: number): string {
  return `REQ-${catCode}-${String(seq).padStart(4, '0')}`;
}

/** 校验是否为合法需求 ID 格式（兼容历史 4~6 位序号） */
export function isValidCode(code: string): boolean {
  return /^REQ-[A-Z0-9]{2,4}-\d{4,6}$/.test(code);
}

/** 从 ID 中提取分类码 */
export function catCodeFromCode(code: string): string | null {
  const m = code.match(/^REQ-([A-Z0-9]{2,4})-\d+$/);
  return m ? m[1] : null;
}

/** 从 ID 中提取序号 */
export function seqFromCode(code: string): number | null {
  const m = code.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
}

/**
 * 存量数据迁移：为缺少 code 的需求按创建时间顺序补发 ID，
 * 并解决重复 ID（保留首个，其余自动重新分配）；
 * 同时将各分类计数器推到该分类最大序号之后。
 * @returns 迁移后的需求数组（若无变化则原样返回同一引用，顺序与入参一致）
 */
export function migrateRequirementCodes(
  reqs: Requirement[],
  categories: Category[],
): Requirement[] {
  // 按创建时间顺序处理（保证补发的序号顺序符合直觉）
  const sorted = [...reqs].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );

  const seen = new Set<string>();
  let changed = false;
  const migrated = sorted.map((r) => {
    let out = r;
    const hasValid = !!r.code && isValidCode(r.code) && !seen.has(r.code);
    if (hasValid) {
      seen.add(r.code!);
      // 同步该分类的计数器下限
      const cc = catCodeFromCode(r.code!);
      const s = seqFromCode(r.code!);
      if (cc && s) ensureSeq(cc, s);
    } else {
      // 无 code / 格式非法 / 与前面的重复 → 补发
      let code = genRequirementCode(r.categoryId, categories);
      while (seen.has(code)) code = genRequirementCode(r.categoryId, categories);
      seen.add(code);
      out = { ...out, code };
      changed = true;
    }
    // 补充 attachments 默认值
    if (!Array.isArray(out.attachments)) {
      out = { ...out, attachments: [] };
      changed = true;
    }
    return out;
  });

  if (!changed) return reqs;
  // 保持与入参一致的顺序
  const orderMap = new Map(migrated.map((r) => [r.id, r]));
  return reqs.map((r) => orderMap.get(r.id) ?? r);
}

/** 生成附件 ID（同时用作 IndexedDB blob key） */
export function genAttachmentId(): string {
  return `att-${genId()}`;
}

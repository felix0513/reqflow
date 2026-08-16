/**
 * 需求版本控制核心逻辑
 *
 * 语义化版本号规则 (Semantic Versioning for Requirements):
 *   v{Major}.{Minor}.{Patch}  例如 "1.0.0"
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                     版本自动升级规则                                 │
 * ├──────────┬──────────────────────────┬──────────────────────────────┤
 * │ 级别      │ 触发条件                  │ 说明                         │
 * ├──────────┼──────────────────────────┼──────────────────────────────┤
 * │ Major    │ 标题(title)变更           │ 需求核心身份改变              │
 * │ (X+1.0.0)│                          │                              │
 * ├──────────┼──────────────────────────┼──────────────────────────────┤
 * │ Minor    │ 描述(description)变更     │ 需求内容/范围实质性修改        │
 * │ (x.Y+1.0)│ 分类(categoryId)变更     │                              │
 * ├──────────┼──────────────────────────┼──────────────────────────────┤
 * │ Patch    │ 状态(status)变更          │ 运营/元数据层面调整            │
 * │ (x.y.Z+1)│ 优先级(priority)变更     │                              │
 * │          │ 标签(tags)变更            │                              │
 * │          │ 截止日期(dueDate)变更     │                              │
 * ├──────────┼──────────────────────────┼──────────────────────────────┤
 * │ Created  │ 新建需求                  │ 初始版本 v1.0.0              │
 * └──────────┴──────────────────────────┴──────────────────────────────┘
 *
 * 多字段同时变更时，取最高级别：Major > Minor > Patch
 */

import type {
  Requirement,
  RequirementVersion,
  VersionChangeType,
  FieldChange,
} from '@/types';
import { PRIORITY_META, STATUS_META } from '@/constants';
import { genId } from '@/constants/id';

/** 初始版本号 */
export const INITIAL_VERSION = '1.0.0';

/** 版本变更类型中文标签 */
export const VERSION_CHANGE_LABELS: Record<VersionChangeType, string> = {
  created: '创建',
  major: '重大变更',
  minor: '内容更新',
  patch: '调整',
};

/** 版本变更类型颜色（用于 UI 标识） */
export const VERSION_CHANGE_COLORS: Record<VersionChangeType, string> = {
  created: '#22c55e', // 绿色
  major: '#ef4444', // 红色
  minor: '#f59e0b', // 橙色
  patch: '#3b82f6', // 蓝色
};

/**
 * 解析版本号字符串为数字元组
 * @example "1.2.3" → [1, 2, 3]
 */
export function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * 将数字元组转为版本号字符串
 * @example [1, 2, 3] → "1.2.3"
 */
export function formatVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

/**
 * 根据变更类型升级版本号
 */
export function bumpVersion(
  currentVersion: string,
  changeType: VersionChangeType,
): string {
  if (changeType === 'created') return INITIAL_VERSION;

  const [major, minor, patch] = parseVersion(currentVersion);
  switch (changeType) {
    case 'major':
      return formatVersion(major + 1, 0, 0);
    case 'minor':
      return formatVersion(major, minor + 1, 0);
    case 'patch':
      return formatVersion(major, minor, patch + 1);
    default:
      return currentVersion;
  }
}

/**
 * 比较需求的新旧值，确定变更类型和字段级变更明细
 * @returns 变更类型（若无变更返回 null）+ 字段变更列表
 */
export function diffRequirements(
  oldReq: Requirement,
  newReq: Requirement,
): { changeType: VersionChangeType | null; changes: FieldChange[] } {
  const changes: FieldChange[] = [];
  let maxLevel: VersionChangeType | null = null;

  // 标题变更 → Major
  if (oldReq.title !== newReq.title) {
    changes.push({
      field: '标题',
      oldValue: oldReq.title,
      newValue: newReq.title,
    });
    maxLevel = 'major';
  }

  // 描述变更 → Minor
  if (oldReq.description !== newReq.description) {
    changes.push({
      field: '描述',
      oldValue: oldReq.description || '（空）',
      newValue: newReq.description || '（空）',
    });
    if (maxLevel !== 'major') maxLevel = 'minor';
  }

  // 分类变更 → Minor
  if (oldReq.categoryId !== newReq.categoryId) {
    changes.push({
      field: '分类',
      oldValue: oldReq.categoryId,
      newValue: newReq.categoryId,
    });
    if (maxLevel !== 'major') maxLevel = 'minor';
  }

  // 状态变更 → Patch
  if (oldReq.status !== newReq.status) {
    changes.push({
      field: '状态',
      oldValue: STATUS_META[oldReq.status].label,
      newValue: STATUS_META[newReq.status].label,
    });
    if (maxLevel === null) maxLevel = 'patch';
  }

  // 优先级变更 → Patch
  if (oldReq.priority !== newReq.priority) {
    changes.push({
      field: '优先级',
      oldValue: PRIORITY_META[oldReq.priority].label,
      newValue: PRIORITY_META[newReq.priority].label,
    });
    if (maxLevel === null) maxLevel = 'patch';
  }

  // 标签变更 → Patch
  const oldTags = [...oldReq.tags].sort().join(', ');
  const newTags = [...newReq.tags].sort().join(', ');
  if (oldTags !== newTags) {
    changes.push({
      field: '标签',
      oldValue: oldReq.tags.join(', ') || '（无）',
      newValue: newReq.tags.join(', ') || '（无）',
    });
    if (maxLevel === null) maxLevel = 'patch';
  }

  // 截止日期变更 → Patch
  if ((oldReq.dueDate ?? '') !== (newReq.dueDate ?? '')) {
    changes.push({
      field: '截止日期',
      oldValue: oldReq.dueDate || '无',
      newValue: newReq.dueDate || '无',
    });
    if (maxLevel === null) maxLevel = 'patch';
  }

  // 创建者变更 → Patch
  if ((oldReq.creator ?? '') !== (newReq.creator ?? '')) {
    changes.push({
      field: '创建者',
      oldValue: oldReq.creator || '（空）',
      newValue: newReq.creator || '（空）',
    });
    if (maxLevel === null) maxLevel = 'patch';
  }

  // 跟进者变更 → Patch
  if ((oldReq.owner ?? '') !== (newReq.owner ?? '')) {
    changes.push({
      field: '跟进者',
      oldValue: oldReq.owner || '（空）',
      newValue: newReq.owner || '（空）',
    });
    if (maxLevel === null) maxLevel = 'patch';
  }

  // 附件变更 → Minor（参考文档增删属于需求范围调整）
  const oldAtts = oldReq.attachments ?? [];
  const newAtts = newReq.attachments ?? [];
  const oldAttKey = oldAtts.map((a) => a.name).sort().join('\u0001');
  const newAttKey = newAtts.map((a) => a.name).sort().join('\u0001');
  if (oldAttKey !== newAttKey) {
    const added = newAtts
      .filter((a) => !oldAtts.some((b) => b.name === a.name))
      .map((a) => a.name);
    const removed = oldAtts
      .filter((a) => !newAtts.some((b) => b.name === a.name))
      .map((a) => a.name);
    const parts: string[] = [];
    if (added.length) parts.push(`新增 ${added.join('、')}`);
    if (removed.length) parts.push(`移除 ${removed.join('、')}`);
    changes.push({
      field: '附件',
      oldValue: oldAtts.map((a) => a.name).join(', ') || '（无）',
      newValue: newAtts.map((a) => a.name).join(', ') || '（无）',
    });
    if (maxLevel !== 'major') maxLevel = 'minor';
    // 将明细写入第一处（changes 已含 oldValue/newValue，parts 供摘要使用）
    (changes[changes.length - 1] as FieldChange & { detail?: string }).detail =
      parts.join('；');
  }

  return { changeType: maxLevel, changes };
}

/**
 * 生成变更摘要（人类可读的一句话）
 */
export function generateChangeSummary(
  changeType: VersionChangeType,
  changes: FieldChange[],
): string {
  if (changeType === 'created') return '需求创建';

  const fieldNames = changes.map((c) => c.field);
  if (fieldNames.length === 0) return '版本更新';

  if (fieldNames.length === 1) {
    const c = changes[0];
    return `${c.field}：${truncate(c.oldValue, 20)} → ${truncate(c.newValue, 20)}`;
  }

  return `更新了 ${fieldNames.join('、')}`;
}

/** 截断字符串 */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

/**
 * 创建版本记录（用于需求创建时）
 */
export function createInitialVersionRecord(req: Requirement): RequirementVersion {
  const now = new Date().toISOString();
  return {
    id: genId(),
    requirementId: req.id,
    projectId: req.projectId,
    version: INITIAL_VERSION,
    changeType: 'created',
    changeSummary: '需求创建',
    changes: [],
    snapshot: { ...req },
    createdAt: now,
  };
}

/**
 * 创建版本记录（用于需求更新时）
 * 如果没有实质变更，返回 null
 */
export function createUpdateVersionRecord(
  oldReq: Requirement,
  newReq: Requirement,
): RequirementVersion | null {
  const { changeType, changes } = diffRequirements(oldReq, newReq);

  // 没有实质性变更（仅 updatedAt 变化），不创建版本记录
  if (changeType === null) return null;

  const newVersion = bumpVersion(oldReq.version, changeType);
  const now = new Date().toISOString();

  return {
    id: genId(),
    requirementId: newReq.id,
    projectId: newReq.projectId,
    version: newVersion,
    changeType,
    changeSummary: generateChangeSummary(changeType, changes),
    changes,
    snapshot: { ...newReq },
    createdAt: now,
  };
}

/**
 * 获取需求的版本历史（按时间降序，最新在前）
 */
export function getVersionHistory(
  versions: RequirementVersion[],
  requirementId: string,
): RequirementVersion[] {
  return versions
    .filter((v) => v.requirementId === requirementId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 比较两个版本号大小
 * @returns 正数表示 v1 > v2，负数表示 v1 < v2，0 表示相等
 */
export function compareVersions(v1: string, v2: string): number {
  const [a1, a2, a3] = parseVersion(v1);
  const [b1, b2, b3] = parseVersion(v2);
  return a1 - b1 || a2 - b2 || a3 - b3;
}

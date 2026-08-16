/**
 * ID 生成工具
 * 内部包装 crypto.randomUUID()，现代浏览器原生支持，无需额外依赖
 */

/** 生成唯一 ID */
export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 兼容性回退方案
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

import type { Requirement, Category, Project } from '@/types';
import { genId } from '@/constants/id';
import { genRequirementCode } from '@/services/idgen';
import { INITIAL_VERSION } from '@/services/versioning';

/**
 * 种子数据：默认项目 + 默认分类 + 示例需求
 * 首次启动（localStorage 无数据）时自动加载
 */

/** 默认项目 ID（固定，便于种子需求引用） */
export const DEFAULT_PROJECT_ID = 'project-default';

/** 默认项目 */
export const DEFAULT_PROJECT: Project = {
  id: DEFAULT_PROJECT_ID,
  name: '默认项目',
  description: '系统自动创建的默认项目，所有已有需求归属此项目',
  color: '#4F46E5',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 默认分类（固定 ID，便于种子需求引用）
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-feature', name: '功能', color: '#6366f1' },
  { id: 'cat-bug', name: 'Bug', color: '#ef4444' },
  { id: 'cat-optimization', name: '优化', color: '#f59e0b' },
  { id: 'cat-other', name: '其他', color: '#6b7280' },
];

/**
 * 创建种子需求数据（首次启动加载）
 * 包含 8 条覆盖各状态/优先级的示例需求
 */
export function createSeedRequirements(): Requirement[] {
  const now = new Date();
  const iso = (offsetDays = 0): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  };
  const dateStr = (offsetDays: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const reqs: Requirement[] = [
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-feature', DEFAULT_CATEGORIES),
      attachments: [],
      title: '用户登录支持手机号验证码',
      version: INITIAL_VERSION,
      description:
        '在现有账号密码登录基础上，新增手机号 + 短信验证码登录方式，提升用户体验与账号安全性。',
      categoryId: 'cat-feature',
      priority: 'P1',
      status: 'todo',
      tags: ['认证', '安全'],
      dueDate: dateStr(7),
      order: 0,
      createdAt: iso(-10),
      updatedAt: iso(-2),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-bug', DEFAULT_CATEGORIES),
      attachments: [],
      title: '修复列表分页溢出导致白屏的问题',
      version: '1.0.1',
      description:
        '当需求条数超过 100 条时，分页组件渲染异常，列表区域出现白屏。需排查分页计算逻辑。',
      categoryId: 'cat-bug',
      priority: 'P0',
      status: 'doing',
      tags: ['前端', '紧急'],
      dueDate: dateStr(-1),
      order: 0,
      createdAt: iso(-8),
      updatedAt: iso(-1),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-optimization', DEFAULT_CATEGORIES),
      attachments: [],
      title: '优化首页首屏加载速度',
      version: '1.1.0',
      description:
        '首屏 LCP 当前为 3.2s，目标降至 1.5s 以内。计划通过懒加载、资源压缩、CDN 优化达成。',
      categoryId: 'cat-optimization',
      priority: 'P2',
      status: 'review',
      tags: ['性能', '体验'],
      dueDate: dateStr(14),
      order: 0,
      createdAt: iso(-7),
      updatedAt: iso(-3),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-feature', DEFAULT_CATEGORIES),
      attachments: [],
      title: '新增需求导出为 PDF 功能',
      version: INITIAL_VERSION,
      description:
        '支持将选中需求导出为 PDF 报告，包含标题、描述、优先级、状态与截止日期等信息。',
      categoryId: 'cat-feature',
      priority: 'P2',
      status: 'review',
      tags: ['导出', '报告'],
      dueDate: dateStr(21),
      order: 1,
      createdAt: iso(-6),
      updatedAt: iso(-4),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-optimization', DEFAULT_CATEGORIES),
      attachments: [],
      title: '看板拖拽交互体验优化',
      version: '1.0.2',
      description:
        '优化拖拽时的视觉反馈，增加占位符提示与过渡动画，支持键盘操作调整卡片位置。',
      categoryId: 'cat-optimization',
      priority: 'P1',
      status: 'testing',
      tags: ['交互', '看板'],
      dueDate: dateStr(3),
      order: 0,
      createdAt: iso(-5),
      updatedAt: iso(-1),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-bug', DEFAULT_CATEGORIES),
      attachments: [],
      title: '修复暗色模式下文字不可见问题',
      version: '1.0.1',
      description:
        '部分次要文字在暗色模式下使用了浅灰色，与背景对比度过低，需统一调整文字色值。',
      categoryId: 'cat-bug',
      priority: 'P1',
      status: 'done',
      tags: ['UI', '暗色模式'],
      dueDate: dateStr(-2),
      order: 0,
      createdAt: iso(-12),
      updatedAt: iso(-2),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-feature', DEFAULT_CATEGORIES),
      attachments: [],
      title: '接入企业微信消息通知',
      version: INITIAL_VERSION,
      description:
        '需求状态变更时，向企业微信群推送通知，支持 @ 相关负责人，提升协作效率。',
      categoryId: 'cat-feature',
      priority: 'P3',
      status: 'todo',
      tags: ['集成', '通知'],
      dueDate: dateStr(30),
      order: 1,
      createdAt: iso(-4),
      updatedAt: iso(-4),
    },
    {
      id: genId(),
      projectId: DEFAULT_PROJECT_ID,
      code: genRequirementCode('cat-other', DEFAULT_CATEGORIES),
      attachments: [],
      title: '清理项目无用依赖项',
      version: INITIAL_VERSION,
      description:
        '移除 package.json 中未使用的依赖包，减小安装体积与构建产物大小。',
      categoryId: 'cat-other',
      priority: 'P3',
      status: 'closed',
      tags: ['工程', '清理'],
      dueDate: null,
      order: 0,
      createdAt: iso(-20),
      updatedAt: iso(-15),
    },
  ];

  return reqs;
}

import { describe, it, expect, beforeEach } from 'vitest';
/**
 * StorageService 单元测试
 *
 * 覆盖：localStorage 读写、JSON 序列化/反序列化、空数据处理、
 *       版本与初始化标记、导出 JSON、清空数据。
 *
 * 说明：vitest 的 jsdom 环境内置 localStorage，每个用例前手动清空以保证隔离。
 */
import { storage } from '@/services/storage';
import { DATA_VERSION } from '@/constants/index';
import type { Requirement, Category, AppSettings } from '@/types';

// ---- 测试夹具工厂 ----
function makeReq(over: Partial<Requirement> = {}): Requirement {
  return {
    id: 'req-1',
    projectId: 'project-default',
    code: 'REQ-TST-00001',
    attachments: [],
    title: '示例需求',
    description: '描述文本',
    categoryId: 'cat-feature',
    priority: 'P1',
    status: 'todo',
    tags: ['前端'],
    dueDate: '2026-01-01',
    order: 0,
    version: '1.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function makeCat(over: Partial<Category> = {}): Category {
  return { id: 'cat-1', name: '功能', color: '#6366f1', ...over };
}

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('需求 (requirements) 读写', () => {
    it('无数据时 loadRequirements 返回空数组', () => {
      expect(storage.loadRequirements()).toEqual([]);
    });

    it('saveRequirements 后 loadRequirements 应返回相同数据', () => {
      const reqs = [makeReq(), makeReq({ id: 'req-2', title: '第二条' })];
      storage.saveRequirements(reqs);
      expect(storage.loadRequirements()).toEqual(reqs);
    });

    it('能正确序列化/反序列化包含中文与特殊字符的数据', () => {
      const reqs = [
        makeReq({
          title: '包含"引号"与\\反斜杠\n换行',
          description: 'emoji 🚀 与中文',
          tags: ['标签一', 'tag/with:slash'],
        }),
      ];
      storage.saveRequirements(reqs);
      expect(storage.loadRequirements()).toEqual(reqs);
    });

    it('空数组保存后读取仍为空数组', () => {
      storage.saveRequirements([]);
      expect(storage.loadRequirements()).toEqual([]);
    });

    it('存储损坏的 JSON 时 loadRequirements 回退为空数组', () => {
      localStorage.setItem('reqflow_requirements', '{not valid json');
      expect(storage.loadRequirements()).toEqual([]);
    });
  });

  describe('分类 (categories) 读写', () => {
    it('无数据时 loadCategories 返回空数组', () => {
      expect(storage.loadCategories()).toEqual([]);
    });

    it('saveCategories 后可正确读取', () => {
      const cats = [makeCat(), makeCat({ id: 'cat-2', name: 'Bug' })];
      storage.saveCategories(cats);
      expect(storage.loadCategories()).toEqual(cats);
    });

    it('损坏 JSON 时回退为空数组', () => {
      localStorage.setItem('reqflow_categories', '!!!broken');
      expect(storage.loadCategories()).toEqual([]);
    });
  });

  describe('设置 (settings) 读写', () => {
    it('无数据时 loadSettings 返回默认 themeMode=system', () => {
      expect(storage.loadSettings()).toEqual({ themeMode: 'system' });
    });

    it('保存后可正确读取', () => {
      const s: AppSettings = { themeMode: 'dark' };
      storage.saveSettings(s);
      expect(storage.loadSettings()).toEqual(s);
    });

    it('损坏 JSON 时回退为默认设置', () => {
      localStorage.setItem('reqflow_settings', 'not-json');
      expect(storage.loadSettings()).toEqual({ themeMode: 'system' });
    });
  });

  describe('版本与初始化标记', () => {
    it('getVersion 无数据时返回 null', () => {
      expect(storage.getVersion()).toBeNull();
    });

    it('setVersion 写入 DATA_VERSION 常量值', () => {
      storage.setVersion();
      expect(storage.getVersion()).toBe(DATA_VERSION);
    });

    it('loadInitialized 默认返回 false', () => {
      expect(storage.loadInitialized()).toBe(false);
    });

    it('setInitialized 后 loadInitialized 返回 true', () => {
      storage.setInitialized();
      expect(storage.loadInitialized()).toBe(true);
    });
  });

  describe('exportJSON', () => {
    it('导出包含 version/requirements/categories/settings 字段', () => {
      storage.saveRequirements([makeReq()]);
      storage.saveCategories([makeCat()]);
      storage.saveSettings({ themeMode: 'dark' });

      const json = storage.exportJSON();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(DATA_VERSION);
      expect(parsed.exportedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(parsed.requirements).toHaveLength(1);
      expect(parsed.categories).toHaveLength(1);
      expect(parsed.settings).toEqual({ themeMode: 'dark' });
    });

    it('导出为格式化（缩进 2 空格）的 JSON 字符串', () => {
      storage.saveRequirements([]);
      const json = storage.exportJSON();
      expect(json).toContain('\n  "version"');
    });

    it('空数据时导出空数组', () => {
      const parsed = JSON.parse(storage.exportJSON());
      expect(parsed.requirements).toEqual([]);
      expect(parsed.categories).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('清空后 requirements/categories/settings/version 均被移除', () => {
      storage.saveRequirements([makeReq()]);
      storage.saveCategories([makeCat()]);
      storage.saveSettings({ themeMode: 'dark' });
      storage.setVersion();

      storage.clearAll();

      expect(localStorage.getItem('reqflow_requirements')).toBeNull();
      expect(localStorage.getItem('reqflow_categories')).toBeNull();
      expect(localStorage.getItem('reqflow_settings')).toBeNull();
      expect(localStorage.getItem('reqflow_version')).toBeNull();
    });

    it('clearAll 不移除 initialized 标记（避免重启重新加载种子）', () => {
      storage.setInitialized();
      storage.clearAll();
      expect(storage.loadInitialized()).toBe(true);
    });
  });
});

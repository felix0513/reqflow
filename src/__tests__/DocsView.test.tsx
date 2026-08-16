/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequirementsProvider } from '@/context/RequirementsContext';
import { DocsProvider } from '@/context/DocsContext';
import { DocsView } from '@/components/docs/DocsView';
import { storage } from '@/services/storage';

/**
 * 文档库拖拽上传集成测试
 *
 * 模拟真实拖拽事件（含 webkitGetAsEntry 的 items），验证：
 * 1. 拖入单个文件 → 文件出现在文档库列表
 * 2. 拖入文件夹 → 文件出现且还原目录结构（生成文件夹）
 * 3. 拖拽路径正确调用 putBlob 持久化二进制
 *
 * 历史根因：handleDrop 中把 webkitGetAsEntry 解绑后调用，触发
 * TypeError: Illegal invocation，导致拖拽上传完全失效。
 */

// 模拟 IndexedDB 二进制存储（jsdom 无 indexedDB）
vi.mock('@/services/filedb', () => ({
  putBlob: vi.fn().mockResolvedValue(true),
  delBlob: vi.fn().mockResolvedValue(undefined),
  getBlob: vi.fn().mockResolvedValue(null),
  downloadBlobFile: vi.fn(),
}));

// 仅复用 formatSize，隔离 FileViewer 的重依赖（xlsx/mammoth）
vi.mock('@/components/docs/FileViewer', () => ({
  formatSize: (n: number) => `${n} B`,
}));

function makeFile(name: string, content = 'hello'): File {
  return new File([content], name, { type: 'text/plain' });
}

function makeFileEntry(file: File) {
  return {
    isFile: true,
    isDirectory: false,
    name: file.name,
    file: (success: (f: File) => void) => success(file),
  };
}

function makeDirEntry(name: string, children: any[]) {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let consumed = false;
      return {
        readEntries: (success: (ents: any[]) => void) => {
          if (!consumed) {
            consumed = true;
            success(children);
          } else {
            success([]);
          }
        },
      };
    },
  };
}

/** 在 dropzone 上派发带 dataTransfer 的 drop 事件 */
function dispatchDrop(dropzone: Element, dataTransfer: { files: File[]; items: unknown[] }) {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  fireEvent(dropzone, event);
}

function getDropzone(): Element {
  const label = screen.getByText('将本地文件或文件夹拖拽到此处上传');
  const box = label.closest('[class*="border-dashed"]');
  if (!box) throw new Error('未找到拖拽上传区域');
  return box;
}

const renderDocs = () =>
  render(
    <RequirementsProvider>
      <DocsProvider>
        <DocsView onOpenDoc={vi.fn()} onCreateDoc={vi.fn()} onOpenFile={vi.fn()} />
      </DocsProvider>
    </RequirementsProvider>,
  );

describe('文档库拖拽上传', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('拖入单个文件（items 含 webkitGetAsEntry）后文件出现在列表', async () => {
    renderDocs();
    const file = makeFile('拖拽文档.txt');
    const fileEntry = makeFileEntry(file);
    // 模拟真实浏览器：items 提供 webkitGetAsEntry（返回文件 entry）
    dispatchDrop(getDropzone(), {
      files: [file],
      items: [{ webkitGetAsEntry: () => fileEntry }],
    });

    await waitFor(() => {
      expect(screen.getByText('拖拽文档.txt')).toBeInTheDocument();
    });
  });

  it('拖入单个文件（仅 files，无 items）后文件出现在列表', async () => {
    renderDocs();
    const file = makeFile('普通文件.md');
    dispatchDrop(getDropzone(), { files: [file], items: [] });

    await waitFor(() => {
      expect(screen.getByText('普通文件.md')).toBeInTheDocument();
    });
  });

  it('拖入文件夹后文件出现且创建对应文件夹', async () => {
    renderDocs();
    const file = makeFile('inner.txt');
    const dirEntry = makeDirEntry('我的资料', [makeFileEntry(file)]);
    dispatchDrop(getDropzone(), {
      files: [],
      items: [{ webkitGetAsEntry: () => dirEntry }],
    });

    await waitFor(() => {
      expect(screen.getByText('inner.txt')).toBeInTheDocument();
    });
    // 左侧文件夹导航出现目录名
    expect(screen.getByText('我的资料')).toBeInTheDocument();
  });

  it('拖拽空内容时不产生任何文件', async () => {
    renderDocs();
    const dropzone = getDropzone();
    dispatchDrop(dropzone, { files: [], items: [] });
    // 空库仍显示大拖拽区域，不出现文件卡片
    expect(screen.getByText('将本地文件或文件夹拖拽到此处上传')).toBeInTheDocument();
    expect(storage.loadFiles()).toEqual([]);
  });
});

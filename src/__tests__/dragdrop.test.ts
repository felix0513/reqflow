import { describe, it, expect } from 'vitest';
import {
  collectDropFiles,
  type DropEntryLike,
  type DropFileEntryLike,
  type DropDirectoryEntryLike,
  type DropItemLike,
} from '@/services/dragdrop';

/**
 * 拖拽文件收集服务单元测试
 *
 * 重点覆盖历史上导致「拖拽上传失效」的根因：
 * webkitGetAsEntry 必须作为方法调用（正确 this 绑定），
 * 否则 Chrome 会抛 TypeError: Illegal invocation。
 */

function makeFile(name: string, content = 'x'): File {
  return new File([content], name, { type: 'text/plain' });
}

function makeFileEntry(file: File): DropFileEntryLike {
  return {
    isFile: true,
    isDirectory: false,
    name: file.name,
    file: (success) => success(file),
  };
}

function makeDirEntry(
  name: string,
  children: DropEntryLike[],
  batches?: DropEntryLike[][],
): DropDirectoryEntryLike {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let consumed = false;
      return {
        readEntries: (success) => {
          // 消费式读取：有 batches 时按序取；否则第一次返回全部，之后返回空
          if (batches && batches.length > 0) {
            success(batches.shift()!);
          } else if (!consumed) {
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

describe('collectDropFiles', () => {
  it('无 items 时回退到 dataTransfer.files（普通文件）', async () => {
    const f = makeFile('a.txt');
    const res = await collectDropFiles(null, [f]);
    expect(res.files).toHaveLength(1);
    expect(res.files[0].name).toBe('a.txt');
    expect(res.relativePaths).toBeUndefined();
  });

  it('items 为空数组时回退到 files', async () => {
    const f = makeFile('b.md');
    const res = await collectDropFiles([], [f]);
    expect(res.files).toEqual([f]);
  });

  it('items 提供文件 entry 但非目录时，回退到 files 列表', async () => {
    const f = makeFile('doc.txt');
    const fileEntry = makeFileEntry(f);
    const items: DropItemLike[] = [{ webkitGetAsEntry: () => fileEntry }];
    const res = await collectDropFiles(items, [f]);
    expect(res.files).toEqual([f]);
    expect(res.relativePaths).toBeUndefined();
  });

  it('拖入文件夹时递归收集文件并还原目录结构', async () => {
    const f1 = makeFile('inner.md');
    const f2 = makeFile('top.txt');
    const dir = makeDirEntry('folder', [
      makeFileEntry(f1),
    ]);
    const items: DropItemLike[] = [
      { webkitGetAsEntry: () => dir },
      { webkitGetAsEntry: () => makeFileEntry(f2) },
    ];
    const res = await collectDropFiles(items, [f1, f2]);
    expect(res.files.map((x) => x.name).sort()).toEqual(['inner.md', 'top.txt']);
    // folder 内文件带相对路径前缀
    expect(res.relativePaths).toBeDefined();
    const rels = res.relativePaths!;
    expect(rels).toContain('folder/inner.md');
    expect(rels).toContain('top.txt');
  });

  it('嵌套目录：相对路径保留完整层级', async () => {
    const f = makeFile('deep.txt');
    const leaf = makeDirEntry('leaf', [makeFileEntry(f)]);
    const root = makeDirEntry('root', [leaf]);
    const items: DropItemLike[] = [{ webkitGetAsEntry: () => root }];
    const res = await collectDropFiles(items, []);
    expect(res.files.map((x) => x.name)).toEqual(['deep.txt']);
    expect(res.relativePaths).toEqual(['root/leaf/deep.txt']);
  });

  it('readEntries 分批返回（>100 条）时循环读取直至为空', async () => {
    const f1 = makeFile('a.txt');
    const f2 = makeFile('b.txt');
    // 第一次返回一批，第二次返回空 —— 模拟 readEntries 需要多次调用
    const batches: DropEntryLike[][] = [
      [makeFileEntry(f1)],
      [makeFileEntry(f2)],
      [],
    ];
    const dir = makeDirEntry('batch', [], batches);
    const items: DropItemLike[] = [{ webkitGetAsEntry: () => dir }];
    const res = await collectDropFiles(items, []);
    expect(res.files.map((x) => x.name).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('webkitGetAsEntry 以正确 this 绑定调用（防止 Illegal invocation 回归）', async () => {
    const f = makeFile('this.txt');
    const fileEntry = makeFileEntry(f);
    let capturedThis: unknown = null;
    const item: DropItemLike = {
      webkitGetAsEntry: function (this: DropItemLike) {
        capturedThis = this;
        return fileEntry;
      },
    };
    const items: DropItemLike[] = [item];
    await collectDropFiles(items, [f]);
    expect(capturedThis).toBe(item);
  });

  it('webkitGetAsEntry 抛异常时不影响回退到 files', async () => {
    const f = makeFile('fallback.txt');
    const items: DropItemLike[] = [
      {
        webkitGetAsEntry: () => {
          throw new TypeError('Illegal invocation');
        },
      },
    ];
    const res = await collectDropFiles(items, [f]);
    expect(res.files).toEqual([f]);
  });

  it('webkitGetAsEntry 返回 null 时回退到 files', async () => {
    const f = makeFile('null.txt');
    const items: DropItemLike[] = [{ webkitGetAsEntry: () => null }];
    const res = await collectDropFiles(items, [f]);
    expect(res.files).toEqual([f]);
  });

  it('items 项缺失 webkitGetAsEntry 方法时回退到 files', async () => {
    const f = makeFile('noentry.txt');
    const items: ArrayLike<DropItemLike> = [{}];
    const res = await collectDropFiles(items, [f]);
    expect(res.files).toEqual([f]);
  });
});

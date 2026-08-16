/**
 * 拖拽文件/文件夹收集服务
 *
 * 从 HTML5 DataTransfer 中提取被拖拽的文件列表，并尽可能还原目录结构。
 * 优先通过 items[i].webkitGetAsEntry() 读取（支持整个文件夹递归遍历），
 * 无法读取时回退到 dataTransfer.files（仅文件，无目录结构）。
 *
 * 注意：webkitGetAsEntry 必须作为 DataTransferItem 的方法调用
 * （item.webkitGetAsEntry()），解绑后调用会触发 TypeError: Illegal invocation，
 * 导致拖拽上传完全失效 —— 这是历史上拖拽上传失效的根因。
 */

/** 最小化的 DataTransferItem 结构（便于单元测试与类型边界清晰） */
export interface DropItemLike {
  webkitGetAsEntry?: (this: DropItemLike) => DropEntryLike | null;
}

/** FileSystemEntry 最小结构 */
export interface DropEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

/** FileSystemFileEntry 最小结构 */
export interface DropFileEntryLike extends DropEntryLike {
  isFile: true;
  isDirectory: false;
  file(success: (file: File) => void, error?: () => void): void;
}

/** FileSystemDirectoryEntry 最小结构 */
export interface DropDirectoryEntryLike extends DropEntryLike {
  isFile: false;
  isDirectory: true;
  createReader(): {
    readEntries(
      success: (entries: DropEntryLike[]) => void,
      error?: () => void,
    ): void;
  };
}

export interface DropCollection {
  files: File[];
  /** 与 files 一一对应的相对路径（仅当拖入文件夹时提供） */
  relativePaths?: string[];
}

/**
 * 收集被拖拽的文件。
 * @param items DataTransfer.items（可为 null/undefined，或 ArrayLike）
 * @param files DataTransfer.files
 */
export async function collectDropFiles(
  items: ArrayLike<DropItemLike> | null | undefined,
  files: ArrayLike<File>,
): Promise<DropCollection> {
  // 1) 尝试从 items 读取 entry（保证 this 绑定正确）
  const entries: DropEntryLike[] = [];
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item.webkitGetAsEntry !== 'function') continue;
      try {
        const entry = item.webkitGetAsEntry();
        if (entry) entries.push(entry);
      } catch {
        // 个别环境下 webkitGetAsEntry 可能抛异常（如历史 Illegal invocation），
        // 忽略该项并回退到 dataTransfer.files 处理
      }
    }
  }

  // 2) 存在目录时递归遍历，还原目录结构
  if (entries.some((en) => en.isDirectory)) {
    const collected: File[] = [];
    const rels: string[] = [];
    await walkEntries(entries, '', collected, rels);
    if (collected.length > 0) {
      return { files: collected, relativePaths: rels };
    }
  }

  // 3) 回退：普通文件列表
  return { files: Array.from(files) };
}

/** 递归遍历目录 entry，收集文件并记录相对路径 */
async function walkEntries(
  entries: DropEntryLike[],
  prefix: string,
  collected: File[],
  rels: string[],
): Promise<void> {
  for (const entry of entries) {
    if (entry.isFile) {
      const fe = entry as DropFileEntryLike;
      const file = await new Promise<File | null>((resolve) => {
        try {
          fe.file(resolve, () => resolve(null));
        } catch {
          resolve(null);
        }
      });
      if (file) {
        collected.push(file);
        rels.push(prefix + file.name);
      }
    } else if (entry.isDirectory) {
      const de = entry as DropDirectoryEntryLike;
      // readEntries 单次最多返回 100 条，需循环读取直至为空
      let reader: ReturnType<DropDirectoryEntryLike['createReader']> | null = null;
      try {
        reader = de.createReader();
      } catch {
        reader = null;
      }
      const children: DropEntryLike[] = [];
      if (reader) {
        let batch: DropEntryLike[] = [];
        let guard = 0;
        do {
          batch = await new Promise<DropEntryLike[]>((resolve) => {
            try {
              reader!.readEntries((ents) => resolve(ents), () => resolve([]));
            } catch {
              resolve([]);
            }
          });
          children.push(...batch);
          // 防御：异常实现可能永远返回非空，避免死循环
          guard += 1;
          if (guard > 10000) break;
        } while (batch.length > 0);
      }
      await walkEntries(children, `${prefix}${entry.name}/`, collected, rels);
    }
  }
}

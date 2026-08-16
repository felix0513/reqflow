# ReqFlow 功能对标与扩展方案（Redmine + 飞书云文档）

> 目标：将 ReqFlow 从"单机需求看板工具"演进为对标 Redmine 的项目管理工具，
> 并增加对标飞书云文档的本地文档管理与编辑能力。

---

## 一、Redmine 功能对标分析

### 1.1 Redmine 核心模块（官方 Features）

| 模块 | Redmine 能力 | ReqFlow 现状 | 差距 |
|------|-------------|-------------|------|
| 多项目管理 | 多项目/子项目、模块开关、公开/私有 | 无项目概念，全局一个工作区 | **缺失** |
| 权限体系 | 基于角色访问控制、多 LDAP、用户注册 | 无用户/权限（本地单机） | 缺失（单机可降级） |
| 问题跟踪 | 自定义状态/类型、工作流转换、自定义字段 | 固定 6 状态、无自定义字段 | 部分缺失 |
| 时间管理 | 甘特图、日历、工时记录与报表 | 无 | **缺失** |
| 知识管理 | Wiki、文档/文件管理、新闻 | 无 | **缺失**（本次新增） |
| 集成能力 | Git/SVN 仓库、Atom 订阅、邮件通知 | 无 | 缺失（单机暂缓） |
| 报表导出 | CSV/PDF 导出问题列表 | 仅 JSON 导出 | **部分缺失**（本次新增） |

### 1.2 基于 Redmine 源码的 Issue 数据模型深度对标

以下对标基于 Redmine 源码实际实现：
- `app/models/issue.rb`（Issue 领域模型，含全部字段与派生逻辑）
- `db/migrate/001_setup.rb`（issues 表结构）

Redmine Issue 完整字段（数据库列）：

| Redmine 字段 | 类型 | ReqFlow 对应 | 差距 |
|-------------|------|-------------|------|
| `subject` | string | `title` | ✅ 已有 |
| `description` | text | `description` | ✅ 已有 |
| `category_id` | FK→IssueCategory | `categoryId` | ✅ 已有 |
| `status_id` | FK→IssueStatus | `status`（6 态） | ⚠️ 固定 6 态，无自定义工作流 |
| `priority_id` | FK→Enum | `priority`（P0-P3） | ✅ 已有 |
| `tracker_id` | FK→Tracker | 无 | ❌ 缺「跟踪标签」（缺陷/功能/支持/任务） |
| `project_id` | FK→Project | 无 | ❌ 缺「项目」概念 |
| `assigned_to_id` | FK→Principal | 无 | ❌ 缺「负责人」 |
| `author_id` | FK→User | 无 | ❌ 缺「创建人」（单机=本地用户） |
| `fixed_version_id` | FK→Version | 无 | ❌ 缺「目标版本」（迭代/里程碑） |
| `start_date` | date | 无 | ❌ 缺「开始日期」 |
| `due_date` | date | `dueDate` | ✅ 已有 |
| `done_ratio` | int(0-100) | 无 | ❌ 缺「完成百分比」 |
| `estimated_hours` | decimal | 无 | ❌ 缺「预估工时」（支持 2h30m） |
| `parent_id` / `root_id` / `lft` / `rgt` | FK / nested set | 无 | ❌ 缺「父子任务层级」 |
| `is_private` | bool | 无 | ❌ 缺「私有」标记（单机降级） |
| `lock_version` | int | 无 | 乐观锁（单机可省略） |
| `watchers` | HABTM→User | 无 | ❌ 缺「关注者」（单机降级） |
| `custom_fields` | acts_as_customizable | 无 | ❌ 缺「自定义字段」 |
| `attachments` | acts_as_attachable | 无 | ❌ 缺「附件」 |
| `journals` | has_many | 无 | ❌ 缺「历史记录/评论」 |
| `relations` | has_many | 无 | ❌ 缺「需求关联」（阻塞/重复/前置） |
| `time_entries` | has_many | 无 | ❌ 缺「工时记录」 |

**Redmine 特有派生能力（父子任务联动）**，ReqFlow 全部缺失：
- 父任务 `start_date`/`due_date` = 子任务最小/最大日期
- 父任务 `priority` = 子任务最高优先级
- 父任务 `done_ratio` = 子任务加权平均

### 1.3 对标优先级（单机桌面场景）

**P0 — 本次实施：**
1. ✅ 多样化导出（Excel / PDF / HTML / Markdown）
2. ✅ 文档管理与编辑（对标飞书云文档）
3. 🔲 **需求字段扩展**（对标 Redmine Issue 核心列）：
   - 跟踪标签 tracker（缺陷/功能/支持/任务，可自定义）
   - 负责人 assignedTo + 创建人 author（单机=本地账户）
   - 目标版本 version（迭代/里程碑，含「未排期」）
   - 开始日期 startDate、完成百分比 doneRatio、预估工时 estimatedHours
4. 🔲 甘特图视图

**P1 — 后续迭代：**
- 评论/历史记录（journals）、附件（attachments）、工时统计、日历视图、数据版本迁移
- 需求关联（relations：前置/后续/重复/阻塞）
- 父子任务层级（parent issue + nested set）
- 自定义字段、自定义状态与工作流

**P2 — 单机场景降级/预留：**
- 多项目（本地工作区切换）、多用户权限（本地账户+角色）、仓库集成、邮件通知

---

## 二、飞书云文档编辑功能对标

### 2.1 飞书核心体验

| 特性 | 飞书实现 | ReqFlow 落地方案 |
|------|---------|----------------|
| 极简格式 | 仅标题级+正文，禁字号 | Markdown 语义化排版 |
| Markdown 输入 | `# 空格` 快速设标题，键盘流 | `@uiw/react-md-editor` 原生支持 |
| 自动目录/大纲 | 左侧按标题生成目录，点击跳转 | 编辑器自带大纲面板 |
| 快捷键 | 格式按钮显示快捷键 | MDEditor 内置 |
| 检查项/任务列表 | 任务可设负责人+Deadline | Markdown 任务列表 `- [ ]` |
| 评论 | 划线评论、@人、解决评论 | 单机降级为文档备注字段 |
| 历史版本 | 一键恢复历史版本 | 文档内容版本快照（后续） |
| 全文搜索 | 秒级定位 | 文档列表标题+内容搜索 |
| 导入/导出 | Word/PDF/Markdown | 导出 MD/HTML/PDF |
| 本地存放 | 云端 | **独立存本地**（Electron 文件系统） |

### 2.2 文档编辑器选型

- **库**：`@uiw/react-md-editor`（React 生态成熟，支持预览/编辑/大纲/快捷键）
- **编辑能力**：标题、加粗/斜体/删除线、列表、引用、代码块、表格、任务列表、链接、图片
- **大纲**：基于标题自动生成左侧目录
- **存储**：
  - Web 模式：localStorage
  - Electron 模式：`app.getPath('documents')/ReqFlowDocs/` 独立 `.md` 文件，实现"文档独立放本地"

---

## 三、导出功能技术方案

| 格式 | 技术方案 | 说明 |
|------|---------|------|
| **Excel** | `xlsx`(SheetJS) | 生成 .xlsx，多列（标题/状态/优先级/分类/标签/截止/更新），中文支持好 |
| **PDF** | Electron `webContents.printToPDF()` | 主进程隐藏窗口渲染 HTML→PDF，中文完美；浏览器 fallback `window.print()` |
| **HTML** | 模板字符串 + Blob | 带内联样式的可打印报告，双击浏览器打开 |
| **Markdown** | 模板字符串 + Blob | 标准 .md 文档，可被 Obsidian/飞书/IDE 直接读取 |

**导出内容**：需求列表（含全部字段），标题含导出时间戳，支持按当前筛选结果导出。

---

## 四、文档管理模块设计

### 4.1 数据模型

```ts
interface DocFolder { id, name, createdAt, updatedAt }
interface Doc {
  id, title, content, folderId,
  description?, tags?,
  createdAt, updatedAt
}
```

### 4.2 页面结构

```
导航 Tab: [需求] [看板] [统计] [文档]
文档页:
 ├─ 左侧: 文件夹树（全部/未分类/各文件夹）+ 新建
 ├─ 中部: 文档列表（卡片/表格，搜索框）
 └─ 编辑页: 大纲(左) + Markdown编辑器(中) + 预览切换
```

### 4.3 Electron 本地文件存储

- 主进程 IPC：`doc:list` / `doc:read` / `doc:save` / `doc:delete`
- 存储路径：`%USERPROFILE%\Documents\ReqFlowDocs\{folder}\{title}.md`
- Web 模式回退 localStorage，保证两种模式均可运行

## 五、需求字段扩展（对标 Redmine Issue）

### 5.1 目标：补齐 Redmine Issue 核心列

将 `Requirement` 从当前 9 字段扩展到对标 Redmine Issue 核心列，同时保持向后兼容（旧数据无损迁移）。

```ts
// 扩展后的 Requirement（新增字段以 + 标注）
interface Requirement {
  id: string;
  title: string;            // = Redmine subject
  description: string;      // = description
  categoryId: string;       // = category_id
  priority: Priority;       // = priority_id（P0-P3）
  status: Status;           // = status_id（6 态，后续可自定义）
  tags: string[];           // 本地增强
  dueDate: string | null;   // = due_date

  // + 对标 Redmine 新增
  trackerId: string;        // + 跟踪标签 tracker_id（缺陷/功能/支持/任务）
  versionId: string | null; // + 目标版本 fixed_version_id（null=未排期）
  assignee: string | null;  // + 负责人 assigned_to_id（单机=本地账户名）
  author: string;           // + 创建人 author_id（单机=当前账户）
  startDate: string | null; // + 开始日期 start_date
  doneRatio: number;        // + 完成百分比 done_ratio（0-100）
  estimatedHours: number;   // + 预估工时 estimated_hours（单位小时）
  parentId: string | null;  // + 父任务 parent_id（预留层级）
  order: number;            // 本地看板排序权重
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 新增辅助实体

```ts
// 跟踪标签（= Redmine Tracker）
interface Tracker {
  id: string;        // 内置：bug/feature/support/task；可自定义
  name: string;      // 缺陷 / 功能 / 支持 / 任务
  color: string;
}

// 目标版本（= Redmine Version）
interface Version {
  id: string;
  name: string;        // 如 "v1.0" / "迭代3"
  status: 'open' | 'locked' | 'closed';  // 对标 Redmine version 状态
  dueDate: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 本地账户（单机降级版 User / Principal）
interface LocalUser {
  id: string;
  name: string;        // 负责人 / 创建人显示名
  createdAt: string;
}
```

### 5.3 数据迁移方案

旧 `DATA_VERSION = '1.0.0'` → 升级到 `1.1.0`，在应用启动时执行无损迁移：

```ts
function migrate(state: AppState): AppState {
  if (dataVersion === '1.0.0') {
    return {
      ...state,
      trackers: [默认缺陷/功能/支持/任务],
      versions: [],
      users: [本地账户],
      requirements: state.requirements.map((r) => ({
        ...r,
        trackerId: 'feature',          // 旧需求默认归为「功能」
        versionId: null,
        assignee: null,
        author: 本地账户名,
        startDate: null,
        doneRatio: r.status === 'done' || r.status === 'closed' ? 100 : 0,
        estimatedHours: 0,
        parentId: null,
      })),
    };
  }
  return state;
}
```

### 5.4 界面落点

| 字段 | 表单位置 | 看板卡片 | 导出列 |
|------|---------|---------|--------|
| 跟踪标签 | 新建/编辑表单顶部下拉 | 类型徽标 | ✅ |
| 负责人 | 表单「负责人」下拉（本地账户） | 卡片角标头像 | ✅ |
| 目标版本 | 表单「版本」下拉 + 新建版本 | 卡片版本徽标 | ✅ |
| 开始日期 | 表单日期段 | 卡片显示起止 | ✅ |
| 完成度 | 表单滑杆/数字 | 卡片进度条 | ✅ |
| 预估工时 | 表单数字输入 | 卡片工时标记 | ✅ |
| 父任务 | 表单「父任务」选择（预留） | 缩进/关联线 | ✅ |

---

## 六、实施路线图

### 阶段一（本次已完成）
1. ✅ 导出服务 `services/export.ts`（Excel/PDF/HTML/Markdown）
2. ✅ 文档数据模型 + localStorage 存储 + Context
3. ✅ 文档列表/文件夹管理视图
4. ✅ Markdown 编辑器（大纲 + 预览 + 快捷键）
5. ✅ Electron IPC：本地文档存取 + PDF 导出

### 阶段二（对标 Redmine Issue 字段扩展）
- 需求字段扩展：tracker / version / assignee / author / startDate / doneRatio / estimatedHours
- 本地账户（单机降级 User）
- 版本管理视图（对标 Redmine Version）
- 数据迁移 v1.0.0 → v1.1.0
- 甘特图视图（按开始/截止日期渲染）

### 阶段三
- 评论/历史记录（journals）、附件（attachments）
- 需求关联（relations：前置/后续/重复/阻塞）
- 父子任务层级（parent issue）
- 自定义字段、自定义状态与工作流
- 历史版本、数据迁移、本地多工作区

---

## 七、依赖清单

| 依赖 | 用途 |
|------|------|
| `xlsx@0.18.5` | Excel 导出 |
| `@uiw/react-md-editor@4` | 文档编辑器（Markdown） |
| Electron IPC（内置） | 本地文件存储 + PDF 导出 |
| （阶段二可选）`@mui/x-charts` | 甘特图 / 工时统计图表 |

---

## 附：对标参考（Redmine GitHub 源码）

- 源码仓库：`https://github.com/redmine/redmine`
- 核心模型：`app/models/issue.rb`
- 表结构：`db/migrate/001_setup.rb`
- 官方功能页：`https://www.redmine.org/projects/redmine/wiki`

> 本文档功能差距评估基于上述源码实际字段与关联关系，非仅官方营销文案。

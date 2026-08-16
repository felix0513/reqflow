# ReqFlow

需求流程管理工具 —— 面向研发团队的需求全生命周期管理桌面应用与可部署 Web 服务。

轻量、可追溯、可私有化。数据默认保存在本地（localStorage + IndexedDB），支持零依赖 Node 服务器部署实现团队多人访问与账号注册。

## ✨ 功能特性

- **项目管理**：多项目工作空间，需求按项目隔离，一键切换过滤。
- **语义化版本控制**：每次变更自动生成版本快照（vX.Y.Z），标题变更升 Major、描述/分类升 Minor、状态/优先级等升 Patch，历史时间线可回溯。
- **全局唯一 ID 号**：`REQ-{分类码}-{序号}`（如 `REQ-FEA-0001`），跨项目永不冲突，支持点击复制。
- **需求管理**：创建/编辑/删除、优先级、状态流转（6 态）、标签、截止日期、逾期筛选、自动保存。
- **创建者/跟进者**：需求关联系统账号，默认创建者为当前账户。
- **附件与文档库**：拖拽上传本地文件/文件夹、Markdown 文档、IndexedDB 大文件存储、`reqflow://` 链接协议全局跳转。
- **多格式预览**：150+ 文本格式、音视频内嵌播放、pptx 幻灯片、doc/ppt 老格式、.eml 邮件、Excel/PDF 等。
- **多格式导出**：Excel / CSV / HTML / Markdown / PDF，支持单条与批量导出。
- **项目状态仪表盘**：跨项目统计、完成率、优先级分布，支持导出报告。
- **服务器部署**：零依赖 Node 服务器 + 用户注册/登录（scrypt 哈希、Bearer 会话）。
- **明暗主题**：支持亮色/暗色/跟随系统。

## 🛠 技术栈

- **前端**：React 18 + TypeScript + MUI 5 + Vite + Tailwind CSS
- **状态管理**：useReducer + Context API
- **持久化**：localStorage（元数据）+ IndexedDB（二进制文件）
- **桌面端**：Electron
- **服务端**：零依赖 Node（http/fs/crypto 内置模块）
- **测试**：Vitest + @testing-library/react + Playwright
- **文档解析**：xlsx、mammoth（docx）、自研最小 ZIP 读取器（pptx）

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18

### 安装

```bash
npm install
```

### 开发模式

```bash
npm run dev
# 打开 http://localhost:5173/
```

### 生产构建

```bash
npm run build
```

### 本地部署（服务器模式）

```bash
npm run build
npm run serve
# 打开 http://localhost:4173/（默认端口，可通过 PORT 环境变量修改）
```

### 桌面应用（Electron）

```bash
npm run electron
```

### 打包安装包

```bash
npm run dist:win   # Windows（NSIS + 便携版）
npm run dist       # 当前平台
```

### 运行测试

```bash
npm test           # 运行全部单元测试
npm run test:watch # 监听模式
```

## 📁 项目结构

```
ReqFlow_Project/
├── electron/            # Electron 主进程与预加载脚本
│   ├── main.cjs
│   └── preload.cjs
├── server/              # 零依赖 Node 服务器（部署模式）
│   └── index.mjs
├── src/
│   ├── components/      # React 组件（dashboard/list/board/docs/drawer 等）
│   ├── context/         # 全局状态（Requirements/Docs/Account）
│   ├── services/        # 业务逻辑（idgen/versioning/export/filedb/dragdrop/ooxml 等）
│   ├── hooks/           # 自定义 Hooks
│   ├── data/            # 种子数据
│   ├── constants/       # 常量定义
│   ├── __tests__/       # 单元测试
│   ├── types.ts         # 全局类型定义
│   └── App.tsx          # 应用入口
├── docs/                # 架构文档（类图/时序图/路线图）
├── prd/                 # 产品需求文档（中英双语）
├── DEPLOYMENT.md        # 部署指导文档
├── package.json
└── vite.config.ts
```

## 📖 文档

- 产品需求文档：[中文版](prd/ReqFlow_PRD_zh_v1.0.md) · [English](prd/ReqFlow_PRD_en_v1.0.md)
- 部署指导：[DEPLOYMENT.md](DEPLOYMENT.md)

## 🔧 核心命令速查

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run serve` | 启动部署服务器（托管 dist/） |
| `npm test` | 运行单元测试 |
| `npm run electron` | 启动 Electron 桌面应用 |
| `npm run dist:win` | 打包 Windows 安装包 |

## 🧩 环境变量（服务器部署）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4173` | 服务监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `REQFLOW_DIST` | `dist/` | 静态资源目录 |

## 📝 License

MIT License

# ReqFlow

A requirements workflow management tool — a desktop app and deployable web service for R&D teams to manage the full requirements lifecycle.

Lightweight, traceable, and private. Data is stored locally by default (localStorage + IndexedDB), with a zero-dependency Node server for team access and user registration.

## ✨ Features

- **Project management**: multiple project workspaces, requirements isolated per project, one-click switching.
- **Semantic version control**: every change auto-records a version snapshot (`vX.Y.Z`); title change bumps Major, description/category bumps Minor, status/priority etc. bump Patch; a history timeline is reviewable.
- **Globally unique IDs**: `REQ-{category-code}-{sequence}` (e.g. `REQ-FEA-0001`), never conflicting across projects, with click-to-copy.
- **Requirement management**: create/edit/delete, priority, 6-state status flow, tags, due dates, overdue filtering, auto-save.
- **Creator / owner**: link requirements to system accounts; the creator defaults to the current account.
- **Attachments & document library**: drag-and-drop upload of files/folders, Markdown documents, IndexedDB large-file storage, `reqflow://` link protocol with global navigation.
- **Multi-format preview**: 150+ text formats, inline audio/video, pptx slides, legacy doc/ppt, .eml email, Excel/PDF, and more.
- **Multi-format export**: Excel / CSV / HTML / Markdown / PDF, single or batch export.
- **Project status dashboard**: cross-project statistics, completion rate, priority distribution, with report export.
- **Server deployment**: zero-dependency Node server + user registration/login (scrypt hashing, Bearer sessions).
- **Light/dark theme**: light, dark, or follow-system.

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + MUI 5 + Vite + Tailwind CSS
- **State management**: useReducer + Context API
- **Persistence**: localStorage (metadata) + IndexedDB (binary files)
- **Desktop**: Electron
- **Server**: zero-dependency Node (built-in `http`/`fs`/`crypto`)
- **Testing**: Vitest + @testing-library/react + Playwright
- **Document parsing**: xlsx, mammoth (docx), a minimal ZIP reader (pptx)

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18

### Install

```bash
npm install
```

### Development

```bash
npm run dev
# open http://localhost:5173/
```

### Production build

```bash
npm run build
```

### Local deployment (server mode)

```bash
npm run build
npm run serve
# open http://localhost:4173/ (default port; override via the PORT env var)
```

### Desktop app (Electron)

```bash
npm run electron
```

### Package installers

```bash
npm run dist:win   # Windows (NSIS + portable)
npm run dist       # current platform
```

### Run tests

```bash
npm test           # run all unit tests
npm run test:watch # watch mode
```

## 📁 Project Structure

```
ReqFlow_Project/
├── electron/            # Electron main & preload scripts
│   ├── main.cjs
│   └── preload.cjs
├── server/              # zero-dependency Node server (deployment mode)
│   └── index.mjs
├── src/
│   ├── components/      # React components (dashboard/list/board/docs/drawer, etc.)
│   ├── context/         # global state (Requirements/Docs/Account)
│   ├── services/        # business logic (idgen/versioning/export/filedb/dragdrop/ooxml, etc.)
│   ├── hooks/           # custom hooks
│   ├── data/            # seed data
│   ├── constants/       # constants
│   ├── __tests__/       # unit tests
│   ├── types.ts         # global type definitions
│   └── App.tsx          # app entry
├── docs/                # architecture docs (class/sequence diagrams, roadmap)
├── DEPLOYMENT.md        # deployment guide
├── package.json
└── vite.config.ts
```

## 📖 Documentation

- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔧 Command Reference

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check + production build |
| `npm run serve` | Start the deployment server (serves `dist/`) |
| `npm test` | Run unit tests |
| `npm run electron` | Launch the Electron desktop app |
| `npm run dist:win` | Package a Windows installer |

## 🧩 Environment Variables (server deployment)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4173` | Server listening port |
| `HOST` | `0.0.0.0` | Listening address |
| `REQFLOW_DIST` | `dist/` | Static assets directory |

## 📝 License

MIT License

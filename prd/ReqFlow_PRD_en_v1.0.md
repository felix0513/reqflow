# ReqFlow Product Requirements Document (PRD)

| Item | Content |
| --- | --- |
| Document Name | ReqFlow Product Requirements Document (PRD) |
| Document Version | v1.0 |
| Date | 2026-08-17 |
| Status | Released |
| Product Name | ReqFlow — Requirements Workflow Management Tool |
| Target Audience | R&D teams, product managers, project managers |

---

## 1. Product Overview

### 1.1 Background & Objectives

Development teams often struggle with scattered requirements, untraceable changes, disconnected documents, missing unified IDs, and difficulty in cross-project statistics. ReqFlow aims to provide a **local-first, privately deployable, zero-external-dependency** tool for the full requirements lifecycle, covering "creation → change traceability → attachments → document library → multi-format export → multi-project statistics".

### 1.2 Product Positioning

A requirements management desktop app plus a deployable web service for small and medium R&D teams. Built around "lightweight, traceable, private", data is stored locally by default (localStorage + IndexedDB), while a zero-dependency Node server enables team access with user registration.

### 1.3 Target Users

- **Product managers / Requirements analysts**: create and maintain requirements, plan priorities and due dates.
- **Developers**: view requirements, link technical documents, move cards across the board.
- **Project managers / Team leads**: cross-project statistics, overdue tracking, report export.

### 1.4 Core Value

1. **Full lifecycle management**: complete status flow from creation to closure with version traceability.
2. **Semantic version control**: every change auto-records a snapshot; history is reviewable.
3. **Globally unique IDs**: `REQ-{category-code}-{sequence}` numbering, never conflicting across projects.
4. **Integrated documents**: built-in document library with multi-format preview; `reqflow://` links connect requirements and documents.
5. **Multi-format export**: one-click export to Excel / CSV / HTML / Markdown / PDF.
6. **Private deployment**: zero-dependency server + user registration/login; data is self-controlled.

### 1.5 Product Scope

This release (v1.0) covers requirement management, version control, export, attachments, document library, preview, deployment & accounts, and statistics dashboards. See Chapter 5 for details.

---

## 2. Terminology & Abbreviations

| Term | Description |
| --- | --- |
| Requirement | The atomic entity managed by the system, with title, description, category, priority, status, tags, due date, etc. |
| Requirement ID (Code) | Globally unique business number, format `REQ-{category-code}-{4-digit sequence}`, e.g. `REQ-FEA-0001`. |
| Category code | 3 uppercase letters identifying the category: FEA=Feature, BUG=Bug, OPT=Optimization, OTH=Other. |
| Priority | Four levels: P0 (Urgent), P1 (High), P2 (Medium), P3 (Low). |
| Status | Six states: review, todo, doing, testing, done, closed. |
| Semantic version | `vX.Y.Z`; title change bumps Major, description/category change bumps Minor, status/priority etc. bump Patch. |
| reqflow:// link | Internal document link protocol, e.g. `reqflow://doc/{id}`, `reqflow://file/{id}`, linking requirements to documents. |
| Document library | Built-in Markdown documents + local file management module. |
| IndexedDB | Browser-side binary storage, used to store uploaded files beyond the localStorage 5MB limit. |

---

## 3. Requirements Overview

| ID | Category | Priority | Status | Title |
| --- | --- | --- | --- | --- |
| REQ-FEA-0001 | Feature | P1 | Done | Project-based requirement management |
| REQ-FEA-0002 | Feature | P1 | Done | Semantic version control for requirements |
| REQ-FEA-0003 | Feature | P1 | Done | Multi-format requirement export |
| REQ-FEA-0004 | Feature | P1 | Done | Globally unique requirement ID |
| REQ-FEA-0005 | Feature | P2 | Done | Single requirement export |
| REQ-FEA-0006 | Feature | P1 | Done | Requirement attachments |
| REQ-FEA-0007 | Feature | P1 | Done | Document library enhancement |
| REQ-FEA-0008 | Feature | P2 | Done | Batch export |
| REQ-FEA-0009 | Feature | P2 | Done | Overdue filtering |
| REQ-FEA-0010 | Feature | P3 | Done | .eml email preview |
| REQ-FEA-0011 | Feature | P1 | Done | Auto-save for requirements |
| REQ-FEA-0012 | Feature | P2 | Done | Multi-format text preview |
| REQ-FEA-0013 | Feature | P2 | Done | Project status dashboard |
| REQ-FEA-0014 | Feature | P1 | Done | Drag-and-drop upload in document library |
| REQ-FEA-0015 | Feature | P1 | Done | Batch selection & delete in document library |
| REQ-FEA-0016 | Feature | P2 | Done | Extended preview formats |
| REQ-FEA-0017 | Feature | P1 | Done | Server deployment & user registration |
| REQ-FEA-0018 | Feature | P2 | Done | Creator / owner fields |
| REQ-BUG-0001 | Bug | P0 | Done | Fix MUI pre-bundling cache white screen |
| REQ-BUG-0002 | Bug | P0 | Done | Fix drag-and-drop upload failure |
| REQ-OPT-0001 | Optimization | P2 | Done | Per-category independent ID sequence |
| REQ-OPT-0002 | Optimization | P3 | Done | Requirement form layout optimization |

---

## 4. Detailed Requirements

### Module 1: Project Management

#### REQ-FEA-0001 Project-based requirement management
- **Priority**: P1
- **Status**: Done
- **Description**: Supports creating multiple project workspaces with requirements isolated by project. A project dropdown at the top filters requirements automatically after switching; legacy requirements are auto-assigned to the default project.
- **Acceptance Criteria**:
  1. Projects can be created, edited, and deleted with name, description, and color fields.
  2. Switching the project dropdown filters the list/board/dashboard to the current project only.
  3. Legacy requirements without a project are auto-assigned to the default project on startup migration.

#### REQ-FEA-0013 Project status dashboard
- **Priority**: P2
- **Status**: Done
- **Description**: Provides a status overview of all projects, showing total count, status distribution, overdue count, completion rate, and priority distribution per project; supports exporting reports (Markdown / HTML / PDF).
- **Acceptance Criteria**:
  1. An "All Projects Status" entry opens an overview dialog showing per-project stat cards.
  2. Completion progress bars and priority distribution charts reflect data correctly.
  3. Status reports can be exported.

### Module 2: Requirement Management

#### REQ-FEA-0004 Globally unique requirement ID
- **Priority**: P1
- **Status**: Done
- **Description**: Each requirement is assigned a globally unique ID in the format `REQ-{category-code}-{sequence}` (e.g. `REQ-FEA-0001`); the category code distinguishes task types; the ID is shown in list/board and supports click-to-copy.
- **Acceptance Criteria**:
  1. New requirements get an ID matching `REQ-[A-Z0-9]{2,4}-\d{4,6}`.
  2. Sequences within the same category code strictly increase and never conflict across projects.
  3. IDs in list/board can be copied by clicking.

#### REQ-OPT-0001 Per-category independent ID sequence
- **Priority**: P2
- **Status**: Done
- **Description**: Each category code counts independently, starting from 0001 (e.g. `REQ-FEA-0001`), avoiding cross-category sequence confusion; legacy 5-digit sequences remain compatible.
- **Acceptance Criteria**:
  1. New feature requirements increment from `REQ-FEA-0001`; bugs count independently from `REQ-BUG-0001`.
  2. Legacy 5-digit sequences (e.g. `REQ-FEA-00042`) are still recognized as valid IDs.

#### REQ-FEA-0011 Auto-save for requirements
- **Priority**: P1
- **Status**: Done
- **Description**: Requirements are auto-saved with 1.2s debounce while editing; any field or attachment change is persisted and triggers a version change, preventing accidental loss.
- **Acceptance Criteria**:
  1. Edits are auto-saved 1.2s after typing stops, without manual action.
  2. Auto-save triggers a version record.
  3. Edited content survives a page refresh.

#### REQ-FEA-0018 Creator / owner fields
- **Priority**: P2
- **Status**: Done
- **Description**: Requirements gain creator and owner fields, selectable from system accounts via dropdown (can be empty); the creator defaults to the current account. Both are shown in details, versions, and exports.
- **Acceptance Criteria**:
  1. New requirements default the creator to the current account and allow editing.
  2. Creator/owner can be picked from the account list or left empty.
  3. The drawer, version diff, and exports all include creator/owner.

#### REQ-OPT-0002 Requirement form layout optimization
- **Priority**: P3
- **Status**: Done
- **Description**: Optimizes the form layout: taller attachment drop zone, description box expanded to 9–18 rows, and the edit drawer widened to 810px.
- **Acceptance Criteria**:
  1. Description box defaults to 9 rows, expandable to 18 rows.
  2. Attachment drop zone minimum height is 120px.
  3. Edit drawer width is 810px for comfortable long-content editing.

### Module 3: Version Control

#### REQ-FEA-0002 Semantic version control for requirements
- **Priority**: P1
- **Status**: Done
- **Description**: Every change auto-generates a version snapshot with `vX.Y.Z` semantics; title change bumps Major, description/category change bumps Minor, status/priority/tags/due-date change bumps Patch; a version history timeline supports review.
- **Acceptance Criteria**:
  1. Title change bumps Major (e.g. 1.0.0 → 2.0.0).
  2. Description/category change bumps Minor; status/priority/tags/due-date bump Patch.
  3. The timeline shows full snapshots of any historical version in read-only mode.

### Module 4: Export

#### REQ-FEA-0003 Multi-format requirement export
- **Priority**: P1
- **Status**: Done
- **Description**: Exports requirements to Excel, CSV, HTML, Markdown, and PDF, including project name and version information.
- **Acceptance Criteria**:
  1. All five formats export with complete content.
  2. Exports include project name, version number, creator, and owner.

#### REQ-FEA-0005 Single requirement export
- **Priority**: P2
- **Status**: Done
- **Description**: The requirement drawer provides an export menu to export a single requirement to Excel/CSV/Markdown/HTML/PDF; filenames are prefixed with the requirement ID.
- **Acceptance Criteria**:
  1. The drawer export menu offers five formats.
  2. Export filenames start with `REQ-{category-code}-{sequence}`.

#### REQ-FEA-0008 Batch export
- **Priority**: P2
- **Status**: Done
- **Description**: Supports selecting multiple requirements and exporting them at once; filenames follow `Project_Category_Version_Date`.
- **Acceptance Criteria**:
  1. Selected requirements can be exported in one click from the action bar.
  2. Export filenames follow the naming convention.

### Module 5: Attachments & Document Library

#### REQ-FEA-0006 Requirement attachments
- **Priority**: P1
- **Status**: Done
- **Description**: Requirements can attach reference files via drag-and-drop upload or by linking from the document library; attachment changes are included in version control; descriptions support pasting `reqflow://` links.
- **Acceptance Criteria**:
  1. Local files can be attached by drag-and-drop or linked from the document library.
  2. Attachment add/remove triggers a version change (Minor).
  3. `reqflow://` links in descriptions open the corresponding document/file on click.

#### REQ-FEA-0007 Document library enhancement
- **Priority**: P1
- **Status**: Done
- **Description**: The document library supports Markdown documents and local file management; binary files are stored in IndexedDB beyond the localStorage 5MB limit; supports multi-format preview and global `reqflow://` link navigation.
- **Acceptance Criteria**:
  1. Markdown documents can be created/edited; local files can be uploaded.
  2. Large files (>5MB) store and retrieve correctly.
  3. Each document/file can copy a `reqflow://` link that navigates to preview globally.

#### REQ-FEA-0014 Drag-and-drop upload in document library
- **Priority**: P1
- **Status**: Done
- **Description**: The document library supports dragging files and folders to upload; an empty library shows a large drop zone, while a populated library keeps a persistent drop zone below the list; dragging a folder preserves its directory structure.
- **Acceptance Criteria**:
  1. Empty library shows a large drop zone; dropping files uploads them.
  2. A populated library still allows drag-and-drop below the list.
  3. Dragging a whole folder restores its directory structure.

#### REQ-FEA-0015 Batch selection & delete in document library
- **Priority**: P1
- **Status**: Done
- **Description**: A "Select" button at the top enters selection mode, where checkboxes allow batch selection of files, documents, and folders, with select-all and batch delete.
- **Acceptance Criteria**:
  1. "Select" enters selection mode with checkboxes on files/documents/folders.
  2. Supports select-all, selected count display, and batch delete (with confirmation).
  3. Deleting a folder moves its contents to "Uncategorized" instead of deleting them.

### Module 6: Preview

#### REQ-FEA-0010 .eml email preview
- **Priority**: P3
- **Status**: Done
- **Description**: The document library supports .eml preview, parsing headers, body, and attachments (base64/quoted-printable encoding, GBK/Big5 charsets).
- **Acceptance Criteria**:
  1. Uploaded .eml files preview headers and body.
  2. Chinese (GBK/Big5) email bodies decode correctly.

#### REQ-FEA-0012 Multi-format text preview
- **Priority**: P2
- **Status**: Done
- **Description**: The document library supports online preview of ~150 code/script/config/style text formats across Windows/macOS/Linux.
- **Acceptance Criteria**:
  1. Common code (js/ts/py/go/java/c/cpp, etc.) and config (yaml/toml/json/ini, etc.) preview as text.
  2. Extension-less files (Makefile/Dockerfile) are recognized and previewed correctly.

#### REQ-FEA-0016 Extended preview formats
- **Priority**: P2
- **Status**: Done
- **Description**: Preview extends to audio/video (embedded player), pptx slide text extraction, doc/ppt legacy format text extraction, xhtml, etc.
- **Acceptance Criteria**:
  1. mp4/webm/ogg videos and mp3/wav/m4a audio play inline.
  2. pptx slides are extracted and shown paginated.
  3. doc/ppt legacy binary formats extract readable text.

### Module 7: Deployment & Accounts

#### REQ-FEA-0017 Server deployment & user registration
- **Priority**: P1
- **Status**: Done
- **Description**: The software supports zero-dependency Node server deployment, providing static hosting and user registration/login APIs (scrypt password hashing, Bearer sessions), with a deployment guide (systemd/pm2/Docker/Nginx).
- **Acceptance Criteria**:
  1. `npm run build && npm run serve` starts the deployment service.
  2. User registration/login works; passwords are scrypt-hashed.
  3. A DEPLOYMENT.md guide is provided.

### Module 8: Bug Fixes

#### REQ-BUG-0001 Fix MUI pre-bundling cache white screen
- **Priority**: P0
- **Status**: Done
- **Description**: Fixes the white screen caused by corrupted MUI pre-bundling cache in Vite production builds (`styled_default is not a function`) by explicitly declaring MUI dependencies in `optimizeDeps.include`.
- **Acceptance Criteria**:
  1. Deployed production builds no longer white-screen.
  2. MUI components (buttons/forms/drawers) render correctly.

#### REQ-BUG-0002 Fix drag-and-drop upload failure
- **Priority**: P0
- **Status**: Done
- **Description**: Fixes ineffective drag-and-drop upload. Root cause: `webkitGetAsEntry` was called unbound, throwing `TypeError: Illegal invocation` and aborting drop handling; refactored into a `collectDropFiles` service with automated tests.
- **Acceptance Criteria**:
  1. Dropped files appear in the document library list.
  2. Dropped folders restore directory structure correctly.
  3. Automated tests cover the core drag-and-drop logic and pass.

### Module 9: Filtering & Statistics

#### REQ-FEA-0009 Overdue filtering
- **Priority**: P2
- **Status**: Done
- **Description**: Adds an "Overdue only" filter showing incomplete requirements past their due date; the overdue count in stat cards is clickable to toggle the filter.
- **Acceptance Criteria**:
  1. Enabling the filter shows only overdue requirements.
  2. The overdue count in stat cards toggles the filter on click.

---

## 5. Non-functional Requirements

### 5.1 Performance
- Requirement lists and boards stay responsive at 1000 requirements (first render < 1s).
- Large file uploads use IndexedDB, unaffected by the localStorage 5MB limit.

### 5.2 Security
- Server-mode passwords are scrypt-hashed with salt; never stored in plain text.
- Sessions use Bearer tokens with a 7-day validity.
- Local-mode data stays in the user's browser and is never transmitted.

### 5.3 Compatibility
- Desktop support for Windows / macOS / Linux (Electron).
- Browser support for modern Chromium engines (Chrome / Edge).

### 5.4 Maintainability
- Frontend is TypeScript strict mode with layered structure (context / services / components / hooks).
- Core logic (ID generation, version control, drag-drop collection, export) is isolated into testable service modules.
- Vitest unit tests + Playwright smoke tests included.

### 5.5 Usability
- Full Chinese UI with light/dark theme switching.
- Auto-save prevents data loss.
- High-frequency actions (drag-and-drop, copy-link) provide intuitive feedback.

---

## 6. Appendix: Requirement-Iteration Mapping

| Iteration | Deliverables | Requirements |
| --- | --- | --- |
| Batch 1 (Foundations) | Project, version, export | REQ-FEA-0001, REQ-FEA-0002, REQ-FEA-0003 |
| Batch 2 (ID & Document Library) | Global ID, single export, attachments, document library | REQ-FEA-0004, REQ-FEA-0005, REQ-FEA-0006, REQ-FEA-0007 |
| Batch 3 (UX & Statistics) | White-screen fix, per-category ID, batch export, overdue filter, layout, eml, auto-save, text preview, dashboard | REQ-BUG-0001, REQ-OPT-0001, REQ-FEA-0008, REQ-FEA-0009, REQ-OPT-0002, REQ-FEA-0010, REQ-FEA-0011, REQ-FEA-0012, REQ-FEA-0013 |
| Batch 4 (Docs & Deployment) | Drag upload, batch delete, extended preview, server deploy & registration, creator/owner | REQ-FEA-0014, REQ-FEA-0015, REQ-FEA-0016, REQ-FEA-0017, REQ-FEA-0018 |
| Batch 5 (Bug Fix) | Drag-and-drop root-cause fix + automated tests | REQ-BUG-0002 |

---

> Disclaimer: This document is AI-assisted for requirement recording and traceability; verify with professionals before making critical decisions.

# Note Management App: Plan

Status: approved (decisions in §2), Phase 0 in progress · Repo: `cspdcl_cse_notes`

## 1. Goal

A personal app for writing, organising, searching and revising Computer Science
notes for the CSPDCL (Assistant Engineer / IT) exam. Generic note apps don't fit
this well. This app should:

- organise notes by the exam syllabus (subject → unit → topic),
- show how much of the syllabus is covered and revised,
- make revision active (flashcards and spaced repetition generated from notes),
- link notes to previous-year questions (PYQs),
- work offline on a laptop and a phone.

### Non-goals for v1
- Real-time multi-user collaboration
- Native mobile apps (the PWA covers mobile)
- Rich WYSIWYG editing (Markdown with live preview is enough)

## 2. Decisions (confirmed 2026-10-10)

1. **Platform:** browser only (installable PWA). No desktop or native app.
2. **Sync:** not needed for now. All data stays in the browser; export/backup
   covers moving data between devices.
3. **Users:** single user. No login or sharing.
4. **Existing notes:** importing uploaded files (PDF/Word) may be needed later,
   so it is in the backlog (F15), not in v1.
5. **Syllabus:** the user will share the official CSPDCL syllabus; the seed in §3
   is a placeholder until then.
6. **Stack:** no preference, so the stack in §4 stands.
7. Notes are Markdown, with math (LaTeX) and code blocks, because CSE notes
   need both (complexity analysis, SQL, C/Java snippets, automata).

## 3. Features

| # | Feature | Priority |
|---|---------|----------|
| F1 | Create, edit and delete notes in a Markdown editor with live preview (KaTeX math, syntax highlighting, tables, images) | P0 |
| F2 | Syllabus tree: Subject → Unit → Topic; every note belongs to one topic | P0 |
| F3 | Tags (e.g. `formula`, `important`, `pyq-2019`, `doubt`) | P0 |
| F4 | Full-text search with filters (subject, tag, status) | P0 |
| F5 | Autosave and offline storage | P0 |
| F6 | Export and import: a single note or everything as Markdown files or a ZIP; full JSON backup | P0 |
| F7 | Topic status: *not started → reading → done → revised*, plus a syllabus progress dashboard | P1 |
| F8 | Flashcards: `Q:: A` lines or `??` blocks inside a note become cards automatically | P1 |
| F9 | Spaced-repetition review queue (SM-2 algorithm) with a daily "due today" view | P1 |
| F10 | PYQ bank: store questions with year and answer, linked to topics; a practice mode | P1 |
| F11 | Links between notes (`[[Note title]]`) and a list of backlinks | P2 |
| F12 | Print/PDF export of a subject as a revision booklet | P2 |
| F13 | Cloud sync across devices plus login (deferred; not planned) | — |
| F15 | Import uploaded files: PDF/Word text extraction into notes, PDFs kept as attachments | P2 |
| F14 | Dark mode and keyboard shortcuts (`Ctrl+K` search, `Ctrl+N` new note) | P1 |

### Pre-seeded syllabus (editable)
Data Structures · Algorithms · Operating Systems · DBMS · Computer Networks ·
Theory of Computation · Compiler Design · Computer Organisation & Architecture ·
Digital Logic · Software Engineering · Discrete Mathematics · Programming (C/C++/Java) ·
Web Technologies · Information Security · General Aptitude & Reasoning.
The user should check this list against the official CSPDCL notification.

## 4. Recommended architecture

**Local-first Progressive Web App.** Everything is stored in the browser
(IndexedDB), so the app works offline and runs fast. Sync is out of scope for now; IDs and
timestamps are chosen so it could be added later without a rewrite.

```
┌──────────────────────── Browser (PWA) ────────────────────────┐
│  UI (React + TS)                                               │
│   ├─ Sidebar: syllabus tree      ├─ Editor (CodeMirror 6)      │
│   ├─ Search (Ctrl+K)             ├─ Preview (markdown-it+KaTeX)│
│   └─ Dashboard / Review / PYQ                                  │
│  State: Zustand          Search index: MiniSearch (in memory)  │
│  Data layer: repository interface ──► Dexie (IndexedDB)        │
│  Service worker (vite-plugin-pwa): offline cache              │
└────────────────────────────────────────────────────────────────┘
```

### Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript | Fast and simple; easy static hosting |
| UI | React + Tailwind CSS | Common choice with many components available |
| Editor | CodeMirror 6 (Markdown mode) | Lightweight, works well on mobile, supports Vim keys if wanted |
| Rendering | markdown-it + KaTeX + highlight.js, sanitised with DOMPurify | Handles math and code; output is safe |
| Storage | Dexie.js over IndexedDB | Typed tables, indexes and schema migrations |
| Search | MiniSearch | Full-text with fuzzy and prefix matching; fine for thousands of notes |
| State | Zustand | Small with little boilerplate |
| Routing | React Router | |
| Offline | vite-plugin-pwa (Workbox) | Installable app with offline cache |
| Testing | Vitest + Testing Library, Playwright for e2e | |
| Lint/format | ESLint + Prettier | |
| Hosting | GitHub Pages or Netlify (static) | Free; deploys from CI |

**Alternatives I considered:**
- Keeping plain Markdown files in this repo and building a static site (MkDocs or
  Docusaurus). This is the simplest option and versioned by git, but there is no
  in-app editing, progress tracking or spaced repetition.
- A full-stack app from day one (Next.js + Postgres). This makes sync and sharing
  easy, but it needs a server, login and a network connection before any note can
  be written.

The local-first PWA, with Markdown export back into this repo (F6), gets most of
the benefit of both.

## 5. Data model

```ts
Subject   { id, name, order, color }
Unit      { id, subjectId, name, order }
Topic     { id, unitId, name, order, status: 'not_started'|'reading'|'done'|'revised',
            lastRevisedAt? }
Note      { id, topicId, title, body /* markdown */, tags: string[],
            pinned: boolean, createdAt, updatedAt, deletedAt? /* soft delete */ }
Card      { id, noteId, front, back, /* SM-2 */ ease, interval, reps, dueAt }
Review    { id, cardId, grade: 0..5, reviewedAt }
Pyq       { id, topicId, year, exam, question, options?, answer, explanation?,
            attempts: { at, correct }[] }
Attachment{ id, noteId, mime, blob }        // pasted images
Meta      { key, value }                    // schema version, settings
```

Dexie indexes: `notes: id, topicId, *tags, updatedAt`, `cards: id, noteId, dueAt`,
`pyqs: id, topicId, year`.
IDs are ULIDs, so they sort by time and can be created offline without collisions
(this matters for sync later).

Cards are **derived** from note text. Every time a note is saved, the app parses
its `Q:: A` lines and updates the matching cards, using a hash of the question
text as a stable key so review history survives edits.

## 6. Project structure

```
/
├─ docs/PLAN.md
├─ src/
│  ├─ app/            routes, layout, providers
│  ├─ features/
│  │  ├─ notes/       editor, preview, note list
│  │  ├─ syllabus/    tree, topic status
│  │  ├─ search/      command palette, MiniSearch index
│  │  ├─ review/      SM-2, flashcard UI
│  │  ├─ pyq/         question bank, practice mode
│  │  └─ io/          import/export (md, zip, json)
│  ├─ db/             Dexie schema, migrations, repositories
│  ├─ lib/            markdown renderer, card parser, ulid, utils
│  └─ seed/syllabus.json
├─ tests/e2e/
├─ public/            icons, manifest
└─ .github/workflows/ci.yml   lint, typecheck, test, deploy to Pages
```

## 7. Milestones

| Phase | Scope | Done when | Estimate* |
|---|---|---|---|
| **0. Setup** | Vite+TS scaffold, lint/format, Vitest, CI, Pages deploy, app shell layout | An empty app deploys from `main` | 0.5 day |
| **1. Core notes (MVP)** | F1, F2, F3, F5, F14 (basic): Dexie schema, syllabus seed, tree sidebar, editor with preview, autosave, tags, soft delete and trash | I can write all my OS notes offline and they are still there after a reload | 3–4 days |
| **2. Find & keep** | F4 search palette and filters, F6 export/import (MD/ZIP/JSON), PWA install and offline | Searching finds any note in under 100 ms; a backup restores everything exactly | 2 days |
| **3. Revise** | F7 progress dashboard, F8 card parser, F9 SM-2 review queue, F10 PYQ bank and practice | A daily review session works from start to finish; the dashboard shows % covered per subject | 3–4 days |
| **4. Extras** | F11 backlinks, F12 PDF booklet, F15 file import | A PDF can be uploaded and turned into a note | 3–4 days |

\*Rough figures for one developer working with Claude. Phases 1–2 together make a
usable product.

## 8. Testing strategy

- **Unit (Vitest):** card parser, SM-2 scheduling, the Markdown renderer
  (including that XSS is sanitised), import/export round trip, DB migrations.
- **Component:** editor autosave debounce, syllabus tree create/rename/reorder.
- **E2E (Playwright, Chromium):** create note → reload → still present; search;
  offline mode (service worker); export then import equals the original.
- CI runs lint, typecheck, unit tests and e2e on every PR.

## 9. Key decisions and risks

| Risk | Mitigation |
|---|---|
| Browser storage gets evicted, so data is lost | Call `navigator.storage.persist()`; show "last backup N days ago" with a one-click export. With no sync, backups are the only safety net |
| Search slows down with large notes | MiniSearch handles thousands of notes; build the index in a Web Worker if needed |
| Card review history breaks when notes are edited | Use stable hash keys (§5) and keep orphaned cards for 30 days |
| Unsafe HTML in Markdown | Always sanitise with DOMPurify |

## 10. Next steps after approval

1. Phase 0 scaffold and CI on branch `claude/relaxed-tesla-n6bv51`.
2. Phase 1 in small PRs: db layer → syllabus tree → editor → tags.

## 11. Open items

1. Official CSPDCL syllabus from the user → replace `src/seed/syllabus.json`.

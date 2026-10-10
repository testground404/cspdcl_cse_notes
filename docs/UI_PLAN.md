# UI Refresh Plan: simple, minimal, calm

Status: approved (decisions in §7); steps 1–3 being built

## 1. Design principles

- **Quiet by default.** Only what you need right now is on screen; actions show on hover
  or sit in a `⋯` menu.
- **Content first.** Notes get a comfortable reading column (about 70 characters wide);
  the interface around them stays in the background.
- **Few colours, soft contrast.** A warm neutral background, soft ink-coloured text and
  one muted accent. No heavy borders, shadows or bright blocks.
- **One thing at a time.** Reading and editing are separate modes, not always side by side.

## 2. Layout

```
┌──────────────────────┬───────────────────────────────────────────────┐
│  🔍 Search      ⌘K   │  Operating Systems › Unit 1 › CPU Scheduling   │
│                      │                                                │
│  HIGHLIGHTS          │  Scheduling Algorithms                ✎  ⋯    │
│    Convoy effect     │                                                │
│    SJF is optimal…   │  A short example note…                         │
│    All highlights →  │                                                │
│                      │  FCFS (First Come First Served)                │
│  TESTS               │  - Non-preemptive; …                           │
│    Start a test      │                                                │
│    Last: OS · 7/10   │  Shortest Job First                            │
│                      │  …                                             │
│  NOTES               │                                                │
│  › Data Structures   │                              ┌ On this page ─┐ │
│  ⌄ Operating Systems │                              │ FCFS          │ │
│    ⌄ Unit 1          │                              │ SJF           │ │
│      ⌄ CPU Sched…    │                              │ Round Robin   │ │
│        • Algorithms  │                              └───────────────┘ │
│  › DBMS              │                                                │
│                      │                                                │
│  ─────────────────   │                                                │
│  Backup · Restore ☾  │                                                │
└──────────────────────┴───────────────────────────────────────────────┘
```

### Left sidebar: three sections

The sidebar has a search box at the top, then three section headers. Each header is a
small uppercase label that collapses its section, and remembers whether it was open.

| Section        | Shows in the sidebar                                         | Clicking the header opens                                                                   |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Highlights** | The 3–5 most recent highlights, plus "All highlights →"      | A page listing every highlight, grouped by subject, with filters                            |
| **Tests**      | "Start a test", plus the last 2–3 results (e.g. _OS · 7/10_) | A tests page: choose the scope (subject, chapter or topic), take the test, see your history |
| **Notes**      | The Subject → Unit → Chapter → Topic tree (as now)           | Home: subjects overview                                                                     |

At the bottom of the sidebar: Backup, Restore and a light/dark toggle. These move out of
the header, which goes away completely; this frees vertical space.

On phones the sidebar is a drawer, the same as now.

### Main area

- **Breadcrumb** in small muted text, then the title. Rename, Move and Delete move into a
  `⋯` menu next to the title.
- **Read mode by default**, with an `✎ Edit` button. Edit mode shows only the Markdown
  editor, with a Preview toggle. A side-by-side view stays available as an option on wide
  screens.
- **Subtopics** move to an "On this page" outline on the right on wide screens, or a
  small dropdown under the title on narrow screens. Adding a subtopic is done by typing a
  `##` heading; a small hint in the editor says so.
- **Save state**: a quiet "Saved" that fades out; errors are shown clearly.
- **Empty states**: one short sentence and one button, e.g. "No units yet. + Add unit".
- **Lists** (units, chapters, topics): simple rows with no borders, and a
  muted count on the right.

## 3. Visual style

Black, white and greys only. No colour accent: emphasis comes from weight, size and contrast.

| Token                   | Light                                         | Dark                             |
| ----------------------- | --------------------------------------------- | -------------------------------- |
| Background              | `#FFFFFF`                                     | `#0F0F0F`                        |
| Sidebar                 | `#F7F7F7`                                     | `#161616`                        |
| Hover / subtle fill     | `#EFEFEF`                                     | `#222222`                        |
| Lines                   | `#E5E5E5`                                     | `#2A2A2A`                        |
| Text                    | `#171717`                                     | `#EDEDED`                        |
| Muted text              | `#737373`                                     | `#8F8F8F`                        |
| Highlight mark          | `#E8E8E8` with a dark underline               | `#333333` with a light underline |
| Correct / wrong (tests) | Black ✓ / grey ✗ with text labels, not colour | same                             |

- **Type:** Inter for the interface; Source Serif 4 for note text (easy to read for long
  stretches); JetBrains Mono for code. The fonts are bundled with the app, so they work
  offline.
- **Sizes:** 14px interface, 17px note text with 1.7 line height, a 70-character column.
- **Spacing:** generous (8px grid); spacing separates sections instead of lines.
- **Motion:** 150ms fades for menus and section collapse, nothing else.
- **Icons:** one thin-line icon set (Lucide), used sparingly.

## 4. Highlights: how they work

There are two kinds, shown together on the Highlights page:

- **Marked text:** in edit mode, select text and press **Highlight** (or `Ctrl+Shift+H`).
  This wraps it in `==text==`, which displays as a grey mark.
- **Key points:** short standalone points you write yourself on the Highlights page,
  optionally attached to a topic (they then also show at the top of that topic).

- The app collects every highlight from all notes: the highlighted text, plus where it
  comes from (subject, chapter, topic and subtopic).
- The Highlights page groups them by subject. Clicking one opens the note and scrolls to it.
- This is useful for last-minute revision: read only the highlights for a subject.

## 5. Tests: how they work (first version)

- Questions live in a **question bank**, separate from notes. Each question is
  multiple choice (2–6 options, one correct), has an optional explanation, and is filed under
  any level of the syllabus (subject, unit, chapter or topic). Question text supports
  Markdown, math and code.
- The **Question bank** page lists questions with a subject filter, and lets you add, edit
  and delete them.
- **Start a test** lets you choose a scope (everything, or any subject/unit/chapter/topic;
  questions filed anywhere underneath are included) and a number of questions. Questions
  appear one at a time in random order; after answering you see whether it was right and the
  explanation.
- At the end you see your score and the questions you got wrong. Results are saved and the
  latest ones show in the sidebar.
- Later: previous-year papers, timed mock tests, and retesting only the questions you got
  wrong.

## 6. Steps

| Step              | What changes                                                                                                                                                                                           | Estimate   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1. Visual refresh | Colour and font tokens, light/dark mode, new sidebar with the three section headers (Highlights and Tests show "coming soon"), `⋯` menus, read mode by default, "On this page" outline, header removed | 1 day      |
| 2. Highlights     | `==mark==` support, Highlight button and shortcut, highlights in the sidebar and their own page                                                                                                        | 0.5–1 day  |
| 3. Tests          | Question syntax, test setup, taking a test, results and history                                                                                                                                        | 1.5–2 days |
| 4. Search         | `Ctrl+K` search across notes and highlights                                                                                                                                                            | 0.5 day    |

Each step is checked in a real browser at phone and desktop sizes, in light and dark mode,
before it's pushed.

## 7. Decisions (confirmed 2026-10-10)

1. **Highlights:** both marked text in notes and standalone key points.
2. **Tests:** questions come from a custom question bank, not from the notes.
3. **Colours:** black and white with shades of grey only.
4. **Default mode:** topics open in Read mode.

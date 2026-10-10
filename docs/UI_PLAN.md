# UI Refresh Plan: simple, minimal, calm

Status: draft, waiting for review

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

| Section | Shows in the sidebar | Clicking the header opens |
|---|---|---|
| **Highlights** | The 3–5 most recent highlights, plus "All highlights →" | A page listing every highlight, grouped by subject, with filters |
| **Tests** | "Start a test", plus the last 2–3 results (e.g. *OS · 7/10*) | A tests page: choose the scope (subject, chapter or topic), take the test, see your history |
| **Notes** | The Subject → Unit → Chapter → Topic tree (as now) | Home: subjects overview |

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

| Token | Light | Dark |
|---|---|---|
| Background | `#FAF9F7` warm off-white | `#1C1B1A` warm charcoal |
| Sidebar | `#F3F1EE` | `#222120` |
| Text | `#2E2C2A` | `#E6E3DF` |
| Muted text | `#8A857F` | `#9A948D` |
| Accent | `#5B7B7A` muted teal | `#86A8A6` |
| Highlight mark | `#F6E7B0` soft yellow | `#5A4E25` |

- **Type:** Inter for the interface; Source Serif 4 for note text (easy to read for long
  stretches); JetBrains Mono for code. The fonts are bundled with the app, so they work
  offline.
- **Sizes:** 14px interface, 17px note text with 1.7 line height, a 70-character column.
- **Spacing:** generous (8px grid); spacing separates sections instead of lines.
- **Motion:** 150ms fades for menus and section collapse, nothing else.
- **Icons:** one thin-line icon set (Lucide), used sparingly.

## 4. Highlights: how they work

- In edit mode, select text and press **Highlight** (or `Ctrl+Shift+H`). This wraps it in
  `==text==`, which displays as a soft yellow mark.
- The app collects every highlight from all notes: the highlighted text, plus where it
  comes from (subject, chapter, topic and subtopic).
- The Highlights page groups them by subject. Clicking one opens the note and scrolls to it.
- This is useful for last-minute revision: read only the highlights for a subject.

## 5. Tests: how they work (first version)

- You write questions inside a note with a simple syntax:
  ```
  Q: Which scheduling algorithm can cause starvation?
  - [ ] FCFS
  - [x] SJF
  - [ ] Round Robin
  > Long jobs may wait forever if short jobs keep arriving.
  ```
  The optional `>` line is an explanation shown after you answer.
- **Start a test** lets you choose a scope (all subjects, one subject, a chapter or a
  topic) and a number of questions. Questions appear one at a time, in random order.
- At the end you see your score and which questions you got wrong, with links to the
  notes they came from. Results are saved, so you can see past attempts.
- Later: previous-year papers, timed mock tests, and retesting only the questions you got
  wrong.

## 6. Steps

| Step | What changes | Estimate |
|---|---|---|
| 1. Visual refresh | Colour and font tokens, light/dark mode, new sidebar with the three section headers (Highlights and Tests show "coming soon"), `⋯` menus, read mode by default, "On this page" outline, header removed | 1 day |
| 2. Highlights | `==mark==` support, Highlight button and shortcut, highlights in the sidebar and their own page | 0.5–1 day |
| 3. Tests | Question syntax, test setup, taking a test, results and history | 1.5–2 days |
| 4. Search | `Ctrl+K` search across notes and highlights | 0.5 day |

Each step is checked in a real browser at phone and desktop sizes, in light and dark mode,
before it's pushed.

## 7. Questions to confirm

1. **Highlights:** should they be text you mark inside notes (as above), or something else,
   such as short standalone "key points" you write separately?
2. **Tests:** are questions written inside the notes (as above) good for now? Or do you
   mainly want previous-year papers or MCQs entered separately?
3. **Colours:** is the warm neutral + muted teal palette OK, or do you prefer another accent
   (e.g. blue, green, purple)?
4. **Default mode:** should topics open in Read mode (recommended) or Edit mode?

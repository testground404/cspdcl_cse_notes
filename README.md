# Synapse Notes (CSPDCL CSE notes)

An offline-first web app for writing, organising and revising Computer Science notes
for the CSPDCL exam. See [docs/PLAN.md](docs/PLAN.md) for the full plan.

## Development

```sh
npm install
npm run dev        # start the dev server
npm test           # unit tests (Vitest)
npm run lint       # oxlint
npm run typecheck  # TypeScript
npm run format     # Prettier
npm run build      # production build in dist/
```

Pushes to the repository's default branch are deployed to GitHub Pages by
`.github/workflows/ci.yml` (enable Pages with source "GitHub Actions" in the repository
settings). The site is at https://testground404.github.io/cspdcl_cse_notes/.

## Using the app

The top bar has **Notes**, **Test** and **Highlights**, plus an account menu (backup, restore, dark
mode) on the right:

- **Highlights**: text marked with `==…==` in notes (select text while editing and press
  Highlight or `Ctrl+Shift+H`), plus standalone key points. The Highlights page groups them
  by subject; clicking one jumps to it.
- **Test**: build your own multiple-choice **question bank**, then take tests on any
  subject, unit, chapter or topic. Results are saved.
- **Notes**: hover (or click) it to pick a subject. A column on the left then shows that
  subject's **Units → Chapters → Topics**, and the topic's note opens to its right. Each topic
  has one Markdown note that opens in Read mode; its `##` headings are the topic's
  **subtopics**. Notes support math (`$x^2$`, `$$...$$`) and fenced code blocks.

On a topic page, the bar under the top bar has **Edit note** (or press `E`), a details card (id, track,
priority, review score and read time, read from the note's metadata block), **Previous / Take Test /
Next**, and the contents of the page. Select text in a note to bold, italicise, code-format or
highlight it right in the page.

Notes can use the full study-note format: a `---` metadata block at the top (hidden when
reading), callout boxes (`> **Define:** …`), tables, Mermaid diagrams (` ```mermaid `), and
question/answer pairs (`Q: …` then `A: …`, or `**Recall:**` then `**Answer:**`) whose answers sit
behind a "Show answer" button. The example topic, Machine Learning › Definition and scope, shows
all of these (its source is `src/seed/ml-definition-and-scope.md`).

Everything is saved automatically in the browser (IndexedDB). Use **Backup** (bottom of the
sidebar) to download a JSON file and **Restore** to load one; clearing browser data deletes
your notes.

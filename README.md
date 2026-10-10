# CSPDCL CSE Notes

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

The sidebar has three sections:

- **Highlights**: text marked with `==…==` in notes (select text while editing and press
  Highlight or `Ctrl+Shift+H`), plus standalone key points. The Highlights page groups them
  by subject; clicking one jumps to it.
- **Tests**: build your own multiple-choice **question bank**, then take tests on any
  subject, unit, chapter or topic. Results are saved.
- **Notes**: **Subject → Unit → Chapter → Topic**. Each topic has one Markdown note that
  opens in Read mode; its `##` headings are the topic's **subtopics**. Notes support math
  (`$x^2$`, `$$...$$`) and fenced code blocks.

Everything is saved automatically in the browser (IndexedDB). Use **Backup** (bottom of the
sidebar) to download a JSON file and **Restore** to load one; clearing browser data deletes
your notes.

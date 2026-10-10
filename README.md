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

- Notes are organised as **Subject → Unit → Chapter → Topic**. Each topic has one
  Markdown note, and its `##` headings are the topic's **subtopics** (shown in the sidebar).
- Notes support Markdown, LaTeX math (`$x^2$`, `$$...$$`) and fenced code blocks.
- Everything is saved automatically in the browser (IndexedDB). Use **Backup** to download
  a JSON file and **Restore** to load one; clearing browser data deletes your notes.

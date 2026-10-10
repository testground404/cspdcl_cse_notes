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

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/ci.yml`
(enable Pages with source "GitHub Actions" in the repository settings).

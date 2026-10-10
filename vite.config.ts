/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Which commit this build is made from: GitHub's SHA in CI, otherwise the local checkout. */
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

const BUILD_ID = buildId()
const BUILT_AT = new Date().toISOString()

/** Publishes version.json next to the app so a running page can tell whether it is out of date. */
const versionFile: Plugin = {
  name: 'version-file',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ id: BUILD_ID, builtAt: BUILT_AT }),
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/cspdcl_cse_notes/ in production.
  base: process.env.GITHUB_PAGES ? '/cspdcl_cse_notes/' : '/',
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  plugins: [react(), tailwindcss(), versionFile],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})

import katexModule from '@vscode/markdown-it-katex'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'

// This package is CommonJS with an `exports.default`; depending on the bundler's interop the
// default import is either the plugin itself or the module object wrapping it.
const katexPlugin =
  (katexModule as unknown as { default?: typeof katexModule }).default ?? katexModule

export function slugify(text: string): string {
  return (
    'st-' +
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
  )
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    const language = lang && hljs.getLanguage(lang) ? lang : null
    const html = language
      ? hljs.highlight(code, { language }).value
      : hljs.highlightAuto(code).value
    return `<pre class="hljs"><code>${html}</code></pre>`
  },
})
  .use(katexPlugin, { throwOnError: false })
  .use(anchor, { level: [2], slugify })

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(source))
}

export interface Subtopic {
  title: string
  slug: string
}

/** The note's level-2 headings (`## ...`), ignoring anything inside code fences. */
export function extractSubtopics(source: string): Subtopic[] {
  const result: Subtopic[] = []
  let fence: string | null = null
  for (const line of source.split('\n')) {
    const fenceMatch = line.match(/^\s*(```|~~~)/)
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1]
      else if (fence === fenceMatch[1]) fence = null
      continue
    }
    if (fence) continue
    const heading = line.match(/^##\s+(.+?)\s*#*\s*$/)
    if (heading) {
      const title = heading[1].trim()
      result.push({ title, slug: slugify(md.renderInline(title).replace(/<[^>]+>/g, '')) })
    }
  }
  return result
}

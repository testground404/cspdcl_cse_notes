import katexModule from '@vscode/markdown-it-katex'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import markPlugin from 'markdown-it-mark'

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
  .use(markPlugin)

// Number each ==highlight== in document order so the Highlights page can link to it.
md.renderer.rules.mark_open = (tokens, idx, options, env, self) => {
  const counter = (env ?? {}) as { marks?: number }
  counter.marks = (counter.marks ?? 0) + 1
  tokens[idx].attrSet('id', highlightId(counter.marks - 1))
  return self.renderToken(tokens, idx, options)
}

export const highlightId = (index: number) => `hl-${index}`

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(source, {}))
}

/** Renders a short piece of text (a question or option) inline, without a wrapping <p>. */
export function renderInlineMarkdown(source: string): string {
  return DOMPurify.sanitize(md.renderInline(source, {}))
}

export interface NoteHighlight {
  index: number
  text: string
  /** Slug of the ## subtopic the highlight is under, if any. */
  subtopic: Subtopic | null
}

/** Every ==highlighted== passage in a note, in the same order the renderer numbers them. */
export function extractHighlights(source: string): NoteHighlight[] {
  const tokens = md.parse(source, {})
  const result: NoteHighlight[] = []
  let subtopic: Subtopic | null = null
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'heading_open' && token.tag === 'h2') {
      const title = tokens[i + 1]?.content ?? ''
      subtopic = { title, slug: slugify(plainText(title)) }
    }
    if (token.type !== 'inline' || !token.children) continue
    let current: string[] | null = null
    for (const child of token.children) {
      if (child.type === 'mark_open') current = []
      else if (child.type === 'mark_close' && current) {
        result.push({ index: result.length, text: current.join('').trim(), subtopic })
        current = null
      } else if (current) {
        // Rebuild the Markdown source so math, code and emphasis render again later.
        if (child.type === 'softbreak' || child.type === 'hardbreak') current.push(' ')
        else if (child.type === 'math_inline') current.push(`$${child.content}$`)
        else if (child.type === 'code_inline') current.push(`\`${child.content}\``)
        else if (child.nesting !== 0) current.push(child.markup)
        else current.push(child.content)
      }
    }
  }
  return result
}

function plainText(inline: string): string {
  return md.renderInline(inline).replace(/<[^>]+>/g, '')
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
      result.push({ title, slug: slugify(plainText(title)) })
    }
  }
  return result
}

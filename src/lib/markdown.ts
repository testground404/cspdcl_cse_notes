import katexModule from '@vscode/markdown-it-katex'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import MarkdownIt, { type Token } from 'markdown-it'
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

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const META_LINE = /^(\s*[\w-]+\s*:.*|\s*-\s.*|\s*#.*|\s*)$/

/** Notes may begin with a `---` YAML block of metadata; it is not part of the content. */
export function stripFrontMatter(source: string): string {
  const match = source.match(FRONT_MATTER)
  if (!match || !match[1].split(/\r?\n/).every((line) => META_LINE.test(line))) return source
  return source.slice(match[0].length)
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
  .use(anchor, { level: [2, 3], slugify })
  .use(markPlugin)

// Typographer is kept for smart quotes, but its replacements turn "(c)" into ©, which would
// corrupt multiple-choice options like "(a) … (b) … (c) …".
md.disable('replacements')

// ```mermaid blocks become a container the page turns into a diagram. The source is stored
// URL-encoded (the sanitiser drops attribute values containing "-->", which every arrow has) and
// stays visible as a fallback if the diagram cannot be drawn.
const defaultFence = md.renderer.rules.fence!
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token.info.trim().split(/\s+/)[0] === 'mermaid') {
    const shown = md.utils.escapeHtml(token.content)
    return `<div class="mermaid-diagram" data-mermaid="${encodeURIComponent(token.content)}"><pre class="hljs"><code>${shown}</code></pre></div>\n`
  }
  return defaultFence(tokens, idx, options, env, self)
}

// Number each ==highlight== in document order so the Highlights page can link to it.
md.renderer.rules.mark_open = (tokens, idx, options, env, self) => {
  const counter = (env ?? {}) as { marks?: number }
  counter.marks = (counter.marks ?? 0) + 1
  tokens[idx].attrSet('id', highlightId(counter.marks - 1))
  return self.renderToken(tokens, idx, options)
}

export const highlightId = (index: number) => `hl-${index}`

/** Splits "(a) … (b) … (c) …" run-on text into one option per line. */
function splitOptions(children: Token[], TokenClass: typeof Token): Token[] {
  const text = children.map((c) => (c.type === 'text' ? c.content : '')).join('')
  if (!/\(a\)\s/.test(text)) return children
  const out: Token[] = []
  for (const child of children) {
    if (child.type !== 'text') {
      out.push(child)
      continue
    }
    child.content.split(/\s+(?=\([a-h]\)\s)/).forEach((part, i) => {
      if (i > 0) out.push(new TokenClass('hardbreak', 'br', 0))
      const text = new TokenClass('text', '', 0)
      text.content = part
      out.push(text)
    })
  }
  return out
}

/** The inline parser leaves empty text tokens between pieces; look past them. */
const isEmptyText = (t: Token | undefined) => t?.type === 'text' && t.content === ''

function startsAnswer(children: Token[], softbreak: number): boolean {
  let n = softbreak + 1
  while (isEmptyText(children[n])) n++
  const next = children[n]
  if (!next) return false
  if (next.type === 'text') return /^A:\s/.test(next.content)
  return next.type === 'strong_open' && /^Answer:/.test(children[n + 1]?.content ?? '')
}

/**
 * Question/answer pairs ("Q: …⏎A: …" or "**Recall:** …⏎**Answer:** …") show the question and
 * hide the answer behind "Show answer", so notes can be used for active recall.
 */
md.core.ruler.push('answers', (state) => {
  const tokens = state.tokens
  for (let i = tokens.length - 2; i > 0; i--) {
    const inline = tokens[i]
    const open = tokens[i - 1]
    if (inline.type !== 'inline' || !inline.children) continue
    if (open.type !== 'paragraph_open' || tokens[i + 1].type !== 'paragraph_close') continue

    const children = inline.children
    const at = children.findIndex((c, k) => c.type === 'softbreak' && startsAnswer(children, k))
    if (at < 0) continue

    const question = children.slice(0, at)
    const answer = children.slice(at + 1)
    while (isEmptyText(question[0])) question.shift()
    while (isEmptyText(answer[0])) answer.shift()
    if (question[0]?.type === 'text')
      question[0].content = question[0].content.replace(/^Q:\s+/, '')
    if (answer[0]?.type === 'text' && /^A:\s/.test(answer[0].content)) {
      answer[0].content = answer[0].content.replace(/^A:\s+/, '')
      if (!answer[0].content) answer.shift()
    }
    const isChoice = /^\[(MCQ|MSQ)\b/.test(question[0]?.content ?? '')
    inline.children = isChoice ? splitOptions(question, state.Token) : question

    const block = (type: string, tag: string, nesting: 1 | 0 | -1, content = '') => {
      const t = new state.Token(type, tag, nesting)
      t.block = true
      t.content = content
      t.level = open.level
      t.hidden = open.hidden
      return t
    }
    const summary = block(
      'html_block',
      '',
      0,
      '<details class="answer"><summary>Show answer</summary>\n',
    )
    summary.hidden = false
    const answerInline = block('inline', '', 0)
    answerInline.children = answer
    const closing = block('html_block', '', 0, '</details>\n')
    closing.hidden = false
    tokens.splice(
      i + 2,
      0,
      summary,
      block('paragraph_open', 'p', 1),
      answerInline,
      block('paragraph_close', 'p', -1),
      closing,
    )
  }
})

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(stripFrontMatter(source), {}))
}

/** Renders a short piece of text (a question or option) inline, without a wrapping <p>. */
export function renderInlineMarkdown(source: string): string {
  return DOMPurify.sanitize(md.renderInline(source, {}))
}

export interface Subtopic {
  title: string
  /** The heading's id in the rendered note. */
  slug: string
  /** 2 for `##`, 3 for `###`. */
  level: 2 | 3
}

function plainText(inline: Token | undefined): string {
  return (inline?.children ?? [])
    .map((c) => {
      if (c.type === 'text' || c.type === 'code_inline') return c.content
      if (c.type === 'math_inline') return `$${c.content}$`
      return ''
    })
    .join('')
    .trim()
}

function headingOf(tokens: Token[], i: number): Subtopic | null {
  const token = tokens[i]
  if (token.type !== 'heading_open' || (token.tag !== 'h2' && token.tag !== 'h3')) return null
  const id = token.attrGet('id')
  if (id === null || id === '') return null
  return { title: plainText(tokens[i + 1]), slug: String(id), level: token.tag === 'h2' ? 2 : 3 }
}

/**
 * The note's `##` and `###` headings. Ids come from the same parse the renderer uses, so they
 * always match the rendered page (including numbered duplicates) and ignore code fences.
 */
export function extractSubtopics(source: string): Subtopic[] {
  const tokens = md.parse(stripFrontMatter(source), {})
  const result: Subtopic[] = []
  for (let i = 0; i < tokens.length; i++) {
    const heading = headingOf(tokens, i)
    if (heading) result.push(heading)
  }
  return result
}

export interface NoteHighlight {
  index: number
  text: string
  /** The nearest heading above the highlight, if any. */
  subtopic: Subtopic | null
}

/** Every ==highlighted== passage in a note, in the same order the renderer numbers them. */
export function extractHighlights(source: string): NoteHighlight[] {
  const tokens = md.parse(stripFrontMatter(source), {})
  const result: NoteHighlight[] = []
  let subtopic: Subtopic | null = null
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    subtopic = headingOf(tokens, i) ?? subtopic
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

import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Code,
  Highlighter,
  Info,
  Italic,
  List,
  Pencil,
  X,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { db, type SyllabusNode } from '../../db/db'
import { addKeyPoint, deleteKeyPoint, saveNote } from '../../db/repo'
import { renderDiagrams } from '../../lib/diagrams'
import { toggleHighlight, wrapSelection } from '../../lib/editing'
import {
  extractSubtopics,
  highlightId,
  readFrontMatter,
  renderInlineMarkdown,
  renderMarkdown,
  stripFrontMatter,
  type Subtopic,
} from '../../lib/markdown'
import { nodeHref, testHref } from '../../app/route'
import { useCurrentTheme } from '../../app/theme'
import type { Syllabus } from '../../app/useSyllabus'
import { HoverPopover } from '../../ui/Popover'
import { ui } from '../../ui/styles'
import { AddForm } from '../nodes/AddForm'
import { NodeHeader } from '../nodes/NodeHeader'

type Mode = 'read' | 'write' | 'preview' | 'split'
type SaveState = 'saved' | 'pending' | 'error'
const SAVE_DELAY_MS = 500
const WORDS_PER_MINUTE = 200

const pad = (n: number) => String(n).padStart(2, '0')

/** "01", "01.1" … numbers matching the badges on the note's `##` headings. */
function numberHeadings(subtopics: Subtopic[]) {
  let section = 0
  let part = 0
  return subtopics.map((s) => {
    if (s.level === 2) {
      section++
      part = 0
      return { ...s, number: pad(section) }
    }
    part++
    return { ...s, number: section ? `${pad(section)}.${part}` : String(part) }
  })
}

const subHeaderLink = 'inline-flex items-center gap-1 text-[13px] transition-opacity'

/**
 * One topic's note. Opens in Read mode; Edit shows the Markdown editor.
 * Mount with key={topic id} so state resets between topics.
 */
export function TopicNote({
  node,
  syllabus,
  subtopic,
  highlight,
}: {
  node: SyllabusNode
  syllabus: Syllabus
  subtopic: string | null
  highlight: number | null
}) {
  const topicId = node.id
  const [body, setBody] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('read')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [savedTick, setSavedTick] = useState(0)
  const [selection, setSelection] = useState<{
    x: number
    top: number
    bottom: number
    text: string
    before: string
  } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const pending = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const keyPoints = useLiveQuery(
    () => db.keyPoints.where('nodeId').equals(topicId).sortBy('createdAt'),
    [topicId],
  )

  useEffect(() => {
    db.notes.get(topicId).then((note) => setBody(note?.body ?? ''))
  }, [topicId])

  // Flush any unsaved text when leaving the topic or closing the tab.
  useEffect(() => {
    const flush = () => {
      window.clearTimeout(timer.current)
      if (pending.current !== null) {
        void saveNote(topicId, pending.current)
        pending.current = null
      }
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [topicId])

  const update = (text: string) => {
    setBody(text)
    pending.current = text
    setSaveState('pending')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const toSave = pending.current
      if (toSave === null) return
      try {
        await saveNote(topicId, toSave)
        if (pending.current === toSave) {
          pending.current = null
          setSaveState('saved')
          setSavedTick((t) => t + 1)
        }
      } catch {
        setSaveState('error')
      }
    }, SAVE_DELAY_MS)
  }

  // "E" toggles editing, as long as the reader is not typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== 'e') return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]'))
        return
      setMode((m) => (m === 'read' ? 'write' : 'read'))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // The floating toolbar: shown while text in the rendered note is selected (Read mode only).
  useEffect(() => {
    if (mode !== 'read') return
    const refresh = () => {
      const sel = window.getSelection()
      const root = contentRef.current
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root) return setSelection(null)
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) return setSelection(null)
      const rect = range.getBoundingClientRect()
      const text = sel.toString()
      if (!text.trim() || rect.width === 0) return setSelection(null)
      // The words before the selection in its paragraph help find it in the Markdown source.
      const start = range.startContainer
      const element =
        start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement
      const block = element?.closest('p, li, td, th, h1, h2, h3, summary, blockquote, pre') ?? root
      const lead = document.createRange()
      lead.selectNodeContents(block)
      lead.setEnd(start, range.startOffset)
      setSelection({
        x: rect.left + rect.width / 2,
        top: rect.top,
        bottom: rect.bottom,
        text,
        before: lead.toString(),
      })
    }
    document.addEventListener('selectionchange', refresh)
    window.addEventListener('scroll', refresh, true)
    return () => {
      document.removeEventListener('selectionchange', refresh)
      window.removeEventListener('scroll', refresh, true)
    }
  }, [mode])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(id)
  }, [notice])

  // Following a subtopic or highlight link while writing switches to reading, where it is shown.
  const target = subtopic ?? (highlight !== null ? `hl:${highlight}` : null)
  const [prevTarget, setPrevTarget] = useState(target)
  if (target !== prevTarget) {
    setPrevTarget(target)
    if (target && mode === 'write') setMode('read')
  }

  const loaded = body !== null
  useEffect(() => {
    if (!target || !loaded || mode === 'write') return
    const id = subtopic ?? highlightId(highlight!)
    const el = contentRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: subtopic ? 'start' : 'center' })
    if (!subtopic) {
      el.classList.remove('flash')
      void el.offsetWidth
      el.classList.add('flash')
    }
  }, [target, subtopic, highlight, mode, loaded])

  const html = useMemo(() => (body === null ? '' : renderMarkdown(body)), [body])
  const subtopics = useMemo(
    () => numberHeadings(body === null ? [] : extractSubtopics(body)),
    [body],
  )
  const meta = useMemo(() => (body === null ? {} : readFrontMatter(body)), [body])
  const readMinutes = useMemo(() => {
    const words = body === null ? 0 : stripFrontMatter(body).split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  }, [body])

  // Previous / next topic within the same subject, in the order of the contents column.
  const subjectId = syllabus.subjectOf(topicId)?.id
  const siblings = useMemo(
    () =>
      syllabus.ordered.filter(
        (n) => n.kind === 'topic' && syllabus.subjectOf(n.id)?.id === subjectId,
      ),
    [syllabus, subjectId],
  )
  const index = siblings.findIndex((n) => n.id === topicId)
  const previous = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 ? siblings[index + 1] : undefined

  // Draw any ```mermaid diagrams. Layout effect so cached diagrams do not flash as code.
  const theme = useCurrentTheme()
  useLayoutEffect(() => {
    if (contentRef.current) void renderDiagrams(contentRef.current, theme)
  }, [html, mode, theme])

  if (body === null) return <p className={`${ui.muted} p-8`}>Loading…</p>

  const highlightSelection = () => {
    const ta = textareaRef.current
    if (!ta) return
    const result = toggleHighlight(body, ta.selectionStart, ta.selectionEnd)
    update(result.text)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.start, result.end)
    })
  }

  const markSelection = (open: string, close = open) => {
    if (!selection) return
    const changed = wrapSelection(body, selection.text, selection.before, open, close)
    if (changed === null) {
      setNotice('Could not place that selection exactly in the note. Use Edit to format it.')
      return
    }
    update(changed)
    window.getSelection()?.removeAllRanges()
    setSelection(null)
  }

  const editing = mode !== 'read'
  const shownSelection = mode === 'read' ? selection : null

  const tab = (m: Mode, label: string, extra = '') => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`rounded-md px-3 py-1 text-[13px] ${extra} ${
        mode === m ? 'bg-canvas font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  const infoRows: [string, string][] = []
  if (meta.id) infoRows.push(['Topic id', meta.id])
  if (meta.exam) infoRows.push(['Track', meta.exam])
  if (meta.priority) infoRows.push(['Priority', meta.priority])
  if (meta.critique_score) {
    const detail = [
      meta.critique_rounds && `${meta.critique_rounds} rounds`,
      meta.critique_status,
    ].filter(Boolean)
    infoRows.push([
      'Review score',
      `${meta.critique_score}/100${detail.length ? ` (${detail.join(' · ')})` : ''}`,
    ])
  }
  if (meta.written_on) infoRows.push(['Written', meta.written_on])
  if (meta.language) infoRows.push(['Language', meta.language])
  infoRows.push(['Read time', `${readMinutes} min read`])
  if (meta.prerequisites) infoRows.push(['Builds on', meta.prerequisites])

  const toc = subtopics.length > 0 && (
    <nav aria-label="On this page" className="text-[13px]">
      <ul className="space-y-0.5">
        {subtopics.map((s, i) => (
          <li key={`${s.slug}-${i}`}>
            <a
              href={nodeHref(topicId, s.slug)}
              className={`flex gap-2 rounded px-2 py-1.5 leading-snug hover:bg-hover hover:text-ink ${
                s.level === 3 ? 'pl-5 text-[12.5px]' : ''
              } ${subtopic === s.slug ? 'bg-hover font-medium text-ink' : 'text-body'}`}
            >
              <span className="shrink-0 font-mono text-[11px] text-muted">{s.number}</span>
              <span className="line-clamp-2">{s.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )

  const keyPointCard = ((keyPoints?.length ?? 0) > 0 || editing) && (
    <section className="mb-8 max-w-[52rem] rounded-xl border border-line bg-soft p-5">
      <h2 className={`${ui.sectionLabel} mb-2`}>Key points</h2>
      {keyPoints && keyPoints.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {keyPoints.map((k) => (
            <li key={k.id} className="group flex gap-2 text-[15px] leading-relaxed text-body">
              <span className="text-muted">—</span>
              <span
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(k.text) }}
              />
              {editing && (
                <button
                  type="button"
                  onClick={() => void deleteKeyPoint(k.id)}
                  aria-label="Delete key point"
                  className="text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <AddForm
          label="Add key point"
          placeholder="A short point worth remembering"
          onAdd={(text) => addKeyPoint(text, topicId)}
        />
      )}
    </section>
  )

  const rendered = (
    <div ref={contentRef} className="note-content min-w-0">
      {body.trim() ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-muted">
          Nothing written yet.{' '}
          <button type="button" className="underline" onClick={() => setMode('write')}>
            Start writing
          </button>
        </p>
      )}
    </div>
  )

  return (
    <>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-canvas/95 px-5 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMode(editing ? 'read' : 'write')}
            className={`${subHeaderLink} font-semibold text-ink hover:opacity-70`}
          >
            {editing ? (
              'Done'
            ) : (
              <>
                <Pencil size={13} /> Edit note
              </>
            )}
            <kbd className="ml-0.5 font-mono text-[10px] font-normal text-muted">E</kbd>
          </button>
          <HoverPopover
            id="topic-info"
            label="Topic details"
            buttonClassName="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-hover text-muted transition-colors hover:bg-ink hover:text-inverse"
            button={() => <Info size={14} />}
          >
            {() => (
              <div className="w-80 space-y-2.5 rounded-xl border border-line bg-canvas p-4 text-[12px] shadow-lg">
                <div className="border-b border-line pb-2 text-[12px] font-semibold text-ink">
                  Topic details
                </div>
                <div className="text-[11px] font-medium text-body">
                  {syllabus
                    .path(topicId)
                    .slice(1, -1)
                    .map((n) => n.name)
                    .join(' › ')}
                </div>
                <dl className="space-y-2">
                  {infoRows.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 text-muted">{label}</dt>
                      <dd className="text-right font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </HoverPopover>
        </div>
        <div className="flex items-center gap-4">
          {previous ? (
            <a
              href={nodeHref(previous.id)}
              title={`Previous: ${previous.name}`}
              className={`${subHeaderLink} text-muted hover:text-ink`}
            >
              <ArrowLeft size={15} /> Previous
            </a>
          ) : (
            <span className={`${subHeaderLink} cursor-not-allowed text-muted opacity-50`}>
              <ArrowLeft size={15} /> Previous
            </span>
          )}
          <a
            href={testHref(topicId)}
            className={`${subHeaderLink} font-semibold text-ink hover:opacity-70`}
          >
            Take Test
          </a>
          {next ? (
            <a
              href={nodeHref(next.id)}
              title={`Next: ${next.name}`}
              className={`${subHeaderLink} font-medium text-ink hover:opacity-70`}
            >
              Next <ArrowRight size={15} />
            </a>
          ) : (
            <span className={`${subHeaderLink} cursor-not-allowed text-muted opacity-50`}>
              Next <ArrowRight size={15} />
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-5 pt-8 pb-24 md:px-10">
        <div className={editing ? '' : 'xl:grid xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-12'}>
          <article className="min-w-0">
            <NodeHeader node={node} syllabus={syllabus} large subtitle={meta.syllabus_ref} />

            {!editing && toc && (
              <details className="mb-6 rounded-xl border border-line px-4 py-3 xl:hidden">
                <summary className={`${ui.sectionLabel} cursor-pointer`}>Table of contents</summary>
                <div className="mt-2">{toc}</div>
              </details>
            )}

            {keyPointCard}

            {editing ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div
                    role="tablist"
                    aria-label="Editor view"
                    className="flex rounded-lg bg-hover p-0.5"
                  >
                    {tab('write', 'Write')}
                    {tab('preview', 'Preview')}
                    {tab('split', 'Split', 'hidden lg:block')}
                  </div>
                  {mode !== 'preview' && (
                    <button
                      type="button"
                      onClick={highlightSelection}
                      className={ui.button}
                      title="Highlight selected text (Ctrl+Shift+H)"
                    >
                      <Highlighter size={15} /> Highlight
                    </button>
                  )}
                  <span
                    key={savedTick}
                    role="status"
                    className={`ml-auto text-xs text-muted ${saveState === 'saved' ? 'fade-out' : ''}`}
                  >
                    {saveState === 'saved'
                      ? 'Saved'
                      : saveState === 'pending'
                        ? 'Saving…'
                        : 'Could not save. Make a backup and reload.'}
                  </span>
                </div>
                <div className={`grid gap-8 ${mode === 'split' ? 'lg:grid-cols-2' : ''}`}>
                  {mode !== 'preview' && (
                    <textarea
                      ref={textareaRef}
                      value={body}
                      onChange={(e) => update(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
                          e.preventDefault()
                          highlightSelection()
                        }
                      }}
                      aria-label="Note (Markdown)"
                      spellCheck
                      placeholder={
                        'Write in Markdown.\n\n## A section heading\n\n- a point with ==highlighted text==\n- math $O(n \\log n)$ and `code`'
                      }
                      className={`min-h-[65vh] w-full resize-y rounded-xl border border-line bg-canvas p-4 font-mono text-[13.5px] leading-relaxed text-ink placeholder:text-muted focus:border-ink focus:outline-none ${
                        mode === 'split' ? 'hidden lg:block' : ''
                      }`}
                    />
                  )}
                  {mode !== 'write' && rendered}
                </div>
                <p className="mt-2 text-xs text-muted">
                  <code>## Heading</code> starts a numbered section · <code>==text==</code>{' '}
                  highlights
                </p>
              </>
            ) : (
              rendered
            )}

            <nav
              aria-label="Topic navigation"
              className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6"
            >
              {previous ? (
                <a
                  href={nodeHref(previous.id)}
                  className="inline-flex max-w-[40%] items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-hover hover:text-ink"
                >
                  <ArrowLeft size={15} className="shrink-0" />
                  <span className="truncate">Previous: {previous.name}</span>
                </a>
              ) : (
                <span />
              )}
              <a
                href={testHref(topicId)}
                className="inline-flex items-center rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-inverse hover:opacity-85"
              >
                Take topic test
              </a>
              {next ? (
                <a
                  href={nodeHref(next.id)}
                  className="inline-flex max-w-[40%] items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-hover"
                >
                  <span className="truncate">Next: {next.name}</span>
                  <ArrowRight size={15} className="shrink-0" />
                </a>
              ) : (
                <span />
              )}
            </nav>
          </article>

          {!editing && (
            <aside className="mt-10 space-y-4 xl:sticky xl:top-20 xl:mt-0 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto">
              {toc && (
                <div className="hidden rounded-xl border border-line bg-canvas p-5 xl:block">
                  <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                    <span className={ui.sectionLabel}>Table of contents</span>
                    <List size={15} className="text-muted" />
                  </div>
                  {toc}
                </div>
              )}
              {next && (
                <a
                  href={nodeHref(next.id)}
                  className="group block rounded-xl border border-line p-5 hover:bg-hover"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className={ui.sectionLabel}>Next topic</span>
                    <ArrowRight
                      size={15}
                      className="text-ink transition-transform group-hover:translate-x-1"
                    />
                  </div>
                  <div className="text-[14px] font-semibold text-ink">{next.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {syllabus
                      .path(next.id)
                      .slice(1, -1)
                      .map((n) => n.name)
                      .join(' › ')}
                  </div>
                </a>
              )}
            </aside>
          )}
        </div>
      </div>

      {shownSelection && (
        <div
          role="toolbar"
          aria-label="Format selection"
          // Keep the text selected while a button is pressed.
          onMouseDown={(e) => e.preventDefault()}
          className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-line bg-ink px-2 py-1.5 text-inverse shadow-xl"
          style={{
            left: Math.min(Math.max(shownSelection.x, 120), window.innerWidth - 120),
            top: shownSelection.top < 120 ? shownSelection.bottom + 10 : shownSelection.top - 50,
          }}
        >
          <button
            type="button"
            title="Bold"
            aria-label="Bold"
            onClick={() => markSelection('**')}
            className="rounded p-1.5 opacity-80 hover:opacity-100"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            title="Italic"
            aria-label="Italic"
            onClick={() => markSelection('*')}
            className="rounded p-1.5 opacity-80 hover:opacity-100"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            title="Code"
            aria-label="Code"
            onClick={() => markSelection('`')}
            className="rounded p-1.5 opacity-80 hover:opacity-100"
          >
            <Code size={15} />
          </button>
          <span className="mx-1 h-5 w-px bg-inverse/30" />
          <button
            type="button"
            title="Highlight"
            aria-label="Highlight"
            onClick={() => markSelection('==')}
            className="flex items-center gap-1.5 rounded-md bg-inverse px-2 py-1 text-[12px] font-semibold text-ink"
          >
            <Highlighter size={14} /> Highlight
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-[13px] text-inverse shadow-xl"
        >
          {notice}
        </div>
      )}
    </>
  )
}

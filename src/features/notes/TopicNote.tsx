import { useLiveQuery } from 'dexie-react-hooks'
import { Highlighter, Pencil, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { db } from '../../db/db'
import { addKeyPoint, deleteKeyPoint, saveNote } from '../../db/repo'
import {
  extractSubtopics,
  highlightId,
  renderInlineMarkdown,
  renderMarkdown,
} from '../../lib/markdown'
import { renderDiagrams } from '../../lib/diagrams'
import { toggleHighlight } from '../../lib/editing'
import { nodeHref } from '../../app/route'
import { useCurrentTheme } from '../../app/theme'
import { ui } from '../../ui/styles'
import { AddForm } from '../nodes/AddForm'

type Mode = 'read' | 'write' | 'preview' | 'split'
type SaveState = 'saved' | 'pending' | 'error'
const SAVE_DELAY_MS = 500

/**
 * One topic's note. Opens in Read mode; Edit shows the Markdown editor.
 * Mount with key={topicId} so state resets between topics.
 */
export function TopicNote({
  topicId,
  subtopic,
  highlight,
  renderHeader,
}: {
  topicId: string
  subtopic: string | null
  highlight: number | null
  renderHeader: (actions: ReactNode) => ReactNode
}) {
  const [body, setBody] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('read')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [savedTick, setSavedTick] = useState(0)
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
  const subtopics = useMemo(() => (body === null ? [] : extractSubtopics(body)), [body])

  // Draw any ```mermaid diagrams. Layout effect so cached diagrams do not flash as code.
  const theme = useCurrentTheme()
  useLayoutEffect(() => {
    if (contentRef.current) void renderDiagrams(contentRef.current, theme)
  }, [html, mode, theme])

  if (body === null) return <p className={ui.muted}>Loading…</p>

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

  const editing = mode !== 'read'
  const headerActions = editing ? (
    <button type="button" onClick={() => setMode('read')} className={ui.outline}>
      Done
    </button>
  ) : (
    <button type="button" onClick={() => setMode('write')} className={ui.outline}>
      <Pencil size={14} /> Edit
    </button>
  )

  const tab = (m: Mode, label: string, extra = '') => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`rounded px-2.5 py-1 text-sm ${extra} ${
        mode === m ? 'bg-canvas font-medium text-ink shadow-sm' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  const rendered = (
    <div ref={contentRef} className="note-content prose min-w-0">
      {body.trim() ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="font-sans text-sm text-muted">
          Nothing written yet.{' '}
          <button type="button" className="underline" onClick={() => setMode('write')}>
            Start writing
          </button>
        </p>
      )}
    </div>
  )

  const keyPointList = (keyPoints?.length || editing) && (
    <section className="mb-8 max-w-[70ch]">
      <h2 className={`${ui.sectionLabel} mb-2`}>Key points</h2>
      {keyPoints && keyPoints.length > 0 && (
        <ul className="mb-2 space-y-1">
          {keyPoints.map((k) => (
            <li key={k.id} className="group flex gap-2 text-[15px] leading-relaxed">
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

  const outline = subtopics.length > 0 && (
    <nav aria-label="On this page" className="text-[13px]">
      <h2 className={`${ui.sectionLabel} mb-2`}>On this page</h2>
      <ul className="space-y-1 border-l border-line">
        {subtopics.map((s, i) => (
          <li key={`${s.slug}-${i}`}>
            <a
              href={nodeHref(topicId, s.slug)}
              className={`-ml-px block border-l py-0.5 ${s.level === 3 ? 'pl-6 text-[12.5px]' : 'pl-3'} ${
                subtopic === s.slug
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <div className="flex gap-12">
      <div className="min-w-0 flex-1">
        {renderHeader(headerActions)}

        {!editing && outline && (
          <details className="mb-6 2xl:hidden">
            <summary className={`${ui.sectionLabel} cursor-pointer`}>On this page</summary>
            <div className="mt-2">{outline}</div>
          </details>
        )}

        {keyPointList}

        {editing ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div
                role="tablist"
                aria-label="Editor view"
                className="flex rounded-md bg-hover p-0.5"
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
                    'Write in Markdown.\n\n## A subtopic heading\n\n- a point with ==highlighted text==\n- math $O(n \\log n)$ and `code`'
                  }
                  className={`min-h-[65vh] w-full resize-y rounded-md border border-line bg-canvas p-4 font-mono text-[13.5px] leading-relaxed text-ink placeholder:text-muted focus:border-ink focus:outline-none ${
                    mode === 'split' ? 'hidden lg:block' : ''
                  }`}
                />
              )}
              {mode !== 'write' && rendered}
            </div>
            <p className="mt-2 text-xs text-muted">
              <code>## Heading</code> makes a subtopic · <code>==text==</code> highlights
            </p>
          </>
        ) : (
          rendered
        )}
      </div>

      {!editing && outline && (
        <aside className="sticky top-0 hidden w-52 shrink-0 self-start pt-16 2xl:block">
          {outline}
        </aside>
      )}
    </div>
  )
}

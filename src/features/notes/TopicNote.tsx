import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../db/db'
import { saveNote } from '../../db/repo'
import { extractSubtopics, renderMarkdown, slugify } from '../../lib/markdown'
import { nodeHref } from '../../app/route'
import { AddForm } from '../nodes/AddForm'

type Mode = 'edit' | 'split' | 'preview'
const MODE_KEY = 'editor-mode'
const SAVE_DELAY_MS = 500

function loadMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY)
    if (m === 'edit' || m === 'split' || m === 'preview') return m
  } catch {
    // ignore
  }
  return 'split'
}

type SaveState = 'saved' | 'pending' | 'error'

/** The note for one topic. Mount with key={topicId} so state resets between topics. */
export function TopicNote({ topicId, subtopic }: { topicId: string; subtopic: string | null }) {
  const [body, setBody] = useState<string | null>(null)
  // Opening a subtopic link while in Edit mode switches to Preview so the heading can be shown.
  const [mode, setModeState] = useState<Mode>(() => {
    const m = loadMode()
    return subtopic && m === 'edit' ? 'preview' : m
  })
  const [prevSubtopic, setPrevSubtopic] = useState(subtopic)
  if (subtopic !== prevSubtopic) {
    setPrevSubtopic(subtopic)
    if (subtopic && mode === 'edit') setModeState('preview')
  }
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const pending = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const previewRef = useRef<HTMLDivElement>(null)

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
        }
      } catch {
        setSaveState('error')
      }
    }, SAVE_DELAY_MS)
  }

  const setMode = (m: Mode) => {
    setModeState(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // ignore
    }
  }

  const html = useMemo(() => (body === null ? '' : renderMarkdown(body)), [body])
  const subtopics = useMemo(() => (body === null ? [] : extractSubtopics(body)), [body])

  // Jump to a subtopic: its heading is in the preview, so scroll there once it is visible.
  const loaded = body !== null
  useEffect(() => {
    if (!subtopic || !loaded || mode === 'edit') return
    const el = previewRef.current?.querySelector(`#${CSS.escape(subtopic)}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [subtopic, mode, loaded])

  if (body === null) return <p className="text-sm text-slate-500">Loading…</p>

  const addSubtopic = (name: string) => {
    const title = name.trim()
    const sep =
      body.trim() === '' ? '' : body.endsWith('\n\n') ? '' : body.endsWith('\n') ? '\n' : '\n\n'
    update(`${body}${sep}## ${title}\n\n`)
    window.location.hash = nodeHref(topicId, slugify(title))
  }

  const tab = (m: Mode, label: string, extra = '') => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`px-3 py-1 text-sm ${extra} ${
        mode === m
          ? 'bg-indigo-600 text-white'
          : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Editor mode"
          className="flex overflow-hidden rounded border border-slate-300 dark:border-slate-700"
        >
          {tab('edit', 'Edit')}
          {tab('split', 'Split', 'hidden lg:block')}
          {tab('preview', 'Preview')}
        </div>
        <span className="text-xs text-slate-500" role="status">
          {saveState === 'saved'
            ? 'Saved'
            : saveState === 'pending'
              ? 'Saving…'
              : 'Could not save!'}
        </span>
      </div>

      <details
        className="mb-3 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
        open
      >
        <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300">
          Subtopics ({subtopics.length})
        </summary>
        <div className="mt-2 space-y-2">
          {subtopics.length > 0 && (
            <ol className="list-decimal space-y-0.5 pl-5">
              {subtopics.map((s, i) => (
                <li key={`${s.slug}-${i}`}>
                  <a
                    href={nodeHref(topicId, s.slug)}
                    className="text-indigo-700 hover:underline dark:text-indigo-300"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs text-slate-500">
            Each <code>## Heading</code> in the note is a subtopic.
          </p>
          <AddForm placeholder="New subtopic name" buttonLabel="Add subtopic" onAdd={addSubtopic} />
        </div>
      </details>

      <div
        className={`grid min-h-[60vh] flex-1 gap-4 ${mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}
      >
        {mode !== 'preview' && (
          <textarea
            value={body}
            onChange={(e) => update(e.target.value)}
            aria-label="Note (Markdown)"
            spellCheck
            placeholder={
              'Write your notes in Markdown.\n\n## A subtopic\n\n- points, **bold**, $math$, ```code```'
            }
            className={`min-h-[60vh] w-full resize-y rounded border border-slate-300 bg-white p-3 font-mono text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900 ${
              mode === 'split' ? 'hidden lg:block' : ''
            }`}
          />
        )}
        {mode !== 'edit' && (
          <div
            ref={previewRef}
            className="note-content prose prose-slate max-w-none overflow-auto rounded border border-slate-200 p-4 dark:prose-invert dark:border-slate-800"
          >
            {body.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-slate-500">Nothing written yet. Switch to Edit to start.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { X } from 'lucide-react'
import { useState } from 'react'
import { addKeyPoint, deleteKeyPoint } from '../../db/repo'
import { renderInlineMarkdown } from '../../lib/markdown'
import type { Syllabus } from '../../app/useSyllabus'
import { NodePicker } from '../../ui/NodePicker'
import { ui } from '../../ui/styles'
import { useHighlights, type HighlightItem } from './useHighlights'

type Kind = 'all' | 'mark' | 'point'

function KeyPointForm({ syllabus }: { syllabus: Syllabus }) {
  const [text, setText] = useState('')
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={ui.outline}>
        Add key point
      </button>
    )
  }
  return (
    <form
      className="mb-8 max-w-xl space-y-3 rounded-lg border border-line p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!text.trim()) return
        await addKeyPoint(text, nodeId)
        setText('')
      }}
    >
      <div>
        <label htmlFor="kp-text" className={ui.label}>
          Key point
        </label>
        <textarea
          id="kp-text"
          autoFocus
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. SJF gives the minimum average waiting time"
          className={ui.input}
        />
      </div>
      <div>
        <label htmlFor="kp-node" className={ui.label}>
          File under (optional)
        </label>
        <NodePicker
          id="kp-node"
          syllabus={syllabus}
          value={nodeId}
          onChange={setNodeId}
          noneLabel="General"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!text.trim()} className={ui.primary}>
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className={ui.button}>
          Done
        </button>
      </div>
    </form>
  )
}

function HighlightRow({ item, syllabus }: { item: HighlightItem; syllabus: Syllabus }) {
  const where = [
    syllabus
      .path(item.nodeId)
      .slice(1)
      .map((n) => n.name)
      .join(' › '),
    item.subtopicTitle,
  ]
    .filter(Boolean)
    .join(' · ')
  const text = (
    <span
      className={item.kind === 'mark' ? 'bg-mark px-0.5' : ''}
      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
    />
  )
  return (
    <li className="group -mx-2 flex gap-3 rounded-md px-2 py-2 hover:bg-hover">
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[16px] leading-relaxed">
          {item.href ? <a href={item.href}>{text}</a> : text}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {item.kind === 'point' ? 'Key point' : 'Marked in note'}
          {where && ` · ${where}`}
        </div>
      </div>
      {item.pointId && (
        <button
          type="button"
          aria-label="Delete key point"
          onClick={() => {
            if (window.confirm('Delete this key point?')) void deleteKeyPoint(item.pointId!)
          }}
          className="self-start p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
        >
          <X size={14} />
        </button>
      )}
    </li>
  )
}

export function HighlightsPage({ syllabus }: { syllabus: Syllabus }) {
  const items = useHighlights()
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind>('all')
  if (!items) return null

  const filtered = items.filter(
    (h) =>
      (kind === 'all' || h.kind === kind) &&
      (!subjectId || syllabus.subjectOf(h.nodeId)?.id === subjectId),
  )

  // Group by subject, in syllabus order; unfiled key points go last under "General".
  const groups = new Map<string, { name: string; items: HighlightItem[] }>()
  for (const s of syllabus.children.get(null) ?? []) groups.set(s.id, { name: s.name, items: [] })
  groups.set('', { name: 'General', items: [] })
  for (const h of filtered) groups.get(syllabus.subjectOf(h.nodeId)?.id ?? '')?.items.push(h)
  const order = (h: HighlightItem) => syllabus.ordered.findIndex((n) => n.id === h.nodeId)
  for (const g of groups.values()) g.items.sort((a, b) => order(a) - order(b) || a.time - b.time)

  return (
    <div className="max-w-3xl">
      <h1 className={`${ui.h1} mb-2`}>Highlights</h1>
      <p className={`${ui.muted} mb-6`}>
        Text marked with <code>==…==</code> in your notes, plus key points you write here. Read just
        these for quick revision.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          aria-label="Subject"
          value={subjectId ?? ''}
          onChange={(e) => setSubjectId(e.target.value || null)}
          className={ui.select}
        >
          <option value="">All subjects</option>
          {(syllabus.children.get(null) ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Type"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className={ui.select}
        >
          <option value="all">Marks and key points</option>
          <option value="mark">Marked in notes</option>
          <option value="point">Key points</option>
        </select>
        <span className="text-xs text-muted tabular-nums">{filtered.length} shown</span>
      </div>

      <KeyPointForm syllabus={syllabus} />

      {filtered.length === 0 ? (
        <p className={`${ui.muted} mt-6`}>
          Nothing here yet. Select text while editing a note and press Highlight, or add a key
          point.
        </p>
      ) : (
        [...groups.values()]
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.name} className="mt-8">
              <h2 className={`${ui.sectionLabel} mb-2`}>{g.name}</h2>
              <ul>
                {g.items.map((h) => (
                  <HighlightRow key={h.key} item={h} syllabus={syllabus} />
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  )
}

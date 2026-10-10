import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { nodeHref, type Route } from '../../app/route'
import { readLocal, writeLocal } from '../../app/storage'
import type { Syllabus } from '../../app/useSyllabus'
import { ui } from '../../ui/styles'
import { pickSubject } from './pickSubject'

const COLLAPSED_KEY = 'tree-collapsed'
const LAST_SUBJECT_KEY = 'last-subject'
const PANEL_OPEN_KEY = 'tree-panel-open'

/** A permanent column showing the current subject's units, chapters and topics. */
export function TreePanel({
  route,
  syllabus,
  onNavigate,
}: {
  route: Route
  syllabus: Syllabus
  onNavigate?: () => void
}) {
  const selectedId = route.page === 'node' ? route.nodeId : null
  const subjectId = pickSubject(
    syllabus,
    selectedId,
    readLocal<string | null>(LAST_SUBJECT_KEY, null),
  )
  const [panelOpen, setPanelOpen] = useState(() => readLocal(PANEL_OPEN_KEY, true))
  // Everything is open by default; the ids the user has folded away are remembered.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(readLocal<string[]>(COLLAPSED_KEY, [])),
  )

  useEffect(() => {
    const subjectOfPage = syllabus.subjectOf(selectedId)
    if (subjectOfPage) writeLocal(LAST_SUBJECT_KEY, subjectOfPage.id)
  }, [selectedId, syllabus])

  // When the open page changes, unfold it and its ancestors so it is always visible. (Adjusting
  // state during render, rather than in an effect, avoids a flash of the collapsed tree.)
  const [seenId, setSeenId] = useState<string | null>(null)
  if (selectedId !== seenId) {
    setSeenId(selectedId)
    const hidden = syllabus.path(selectedId).filter((n) => collapsed.has(n.id))
    if (hidden.length) {
      const next = new Set(collapsed)
      for (const n of hidden) next.delete(n.id)
      writeLocal(COLLAPSED_KEY, [...next])
      setCollapsed(next)
    }
  }

  const toggle = (id: string) => {
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    writeLocal(COLLAPSED_KEY, [...next])
    setCollapsed(next)
  }
  const setOpen = (open: boolean) => {
    writeLocal(PANEL_OPEN_KEY, open)
    setPanelOpen(open)
  }

  const subject = subjectId ? syllabus.nodes.get(subjectId) : undefined

  const renderLevel = (parentId: string): ReactNode => {
    const children = syllabus.children.get(parentId) ?? []
    const kind = children[0]?.kind
    const wrapper =
      kind === 'chapter'
        ? 'ml-2 space-y-0.5 border-l border-line pl-3'
        : kind === 'topic'
          ? 'mt-0.5 space-y-0.5 pl-2'
          : 'space-y-0.5'
    return (
      <ul role="group" className={wrapper}>
        {children.map((node) => {
          const hasChildren = syllabus.children.has(node.id)
          const isOpen = !collapsed.has(node.id)
          const isSelected = selectedId === node.id
          const isTopic = node.kind === 'topic'
          return (
            <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
              <div
                className={`flex items-center rounded ${
                  isSelected ? 'bg-hover' : 'hover:bg-hover'
                }`}
              >
                {!isTopic && (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    tabIndex={hasChildren ? 0 : -1}
                    aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                    className={`flex h-6 w-5 shrink-0 items-center justify-center text-muted hover:text-ink ${
                      hasChildren ? '' : 'invisible'
                    }`}
                  >
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                )}
                <a
                  href={nodeHref(node.id)}
                  onClick={onNavigate}
                  title={node.name}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`min-w-0 flex-1 py-0.5 pr-2 text-[13px] ${
                    isTopic ? 'truncate pl-2' : 'line-clamp-2 leading-snug'
                  } ${
                    node.kind === 'unit'
                      ? 'font-semibold text-ink'
                      : isSelected
                        ? 'font-bold text-ink'
                        : node.kind === 'chapter'
                          ? 'font-medium text-muted hover:text-ink'
                          : 'text-muted hover:text-ink'
                  }`}
                >
                  {node.name}
                </a>
              </div>
              {hasChildren && isOpen && renderLevel(node.id)}
            </li>
          )
        })}
      </ul>
    )
  }

  if (!panelOpen) {
    return (
      <aside
        aria-label="Subject contents"
        className="hidden w-11 shrink-0 flex-col items-center border-r border-line bg-panel py-3 md:flex"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show contents"
          title="Show contents"
          className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink"
        >
          <PanelLeftOpen size={17} strokeWidth={1.75} />
        </button>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Subject contents"
      className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-line bg-panel md:flex"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        {subject ? (
          <a
            href={nodeHref(subject.id)}
            onClick={onNavigate}
            title={subject.name}
            className="min-w-0 truncate text-[11px] font-bold tracking-widest text-muted uppercase hover:text-ink"
          >
            {subject.name}
          </a>
        ) : (
          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">
            Contents
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide contents"
          title="Hide contents"
          className="shrink-0 rounded p-0.5 text-muted hover:text-ink"
        >
          <PanelLeftClose size={16} strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex-1 px-3 py-2">
        {subject ? (
          syllabus.children.has(subject.id) ? (
            <div role="tree" aria-label={`${subject.name} contents`}>
              {renderLevel(subject.id)}
            </div>
          ) : (
            <p className="px-2 text-[12.5px] text-muted">
              No units yet.{' '}
              <a href={nodeHref(subject.id)} className="underline">
                Add one
              </a>
            </p>
          )
        ) : (
          <p className={`${ui.muted} px-2`}>
            Choose a subject to see its units, chapters and topics.
          </p>
        )}
      </div>
    </aside>
  )
}

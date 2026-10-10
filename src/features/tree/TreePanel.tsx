import { ChevronRight } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { nodeHref, type Route } from '../../app/route'
import { readLocal, writeLocal } from '../../app/storage'
import type { Syllabus } from '../../app/useSyllabus'
import { pickSubject } from './pickSubject'
import { ui } from '../../ui/styles'

const COLLAPSED_KEY = 'tree-collapsed'
const LAST_SUBJECT_KEY = 'last-subject'

const rowClass = (selected: boolean) =>
  `flex items-center rounded-md text-[13px] ${
    selected ? 'bg-hover font-medium text-ink' : 'text-ink/80 hover:bg-hover hover:text-ink'
  }`

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

  const subject = subjectId ? syllabus.nodes.get(subjectId) : undefined

  const renderLevel = (parentId: string, depth: number): ReactNode => {
    const children = syllabus.children.get(parentId) ?? []
    return (
      <ul role="group">
        {children.map((node) => {
          const hasChildren = syllabus.children.has(node.id)
          const isOpen = !collapsed.has(node.id)
          const isSelected = selectedId === node.id
          return (
            <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
              <div className={rowClass(isSelected)} style={{ paddingLeft: depth * 14 }}>
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  tabIndex={hasChildren ? 0 : -1}
                  aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  className={`flex h-7 w-6 shrink-0 items-center justify-center text-muted ${
                    hasChildren ? '' : 'invisible'
                  }`}
                >
                  <ChevronRight
                    size={13}
                    className={`transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
                  />
                </button>
                <a
                  href={nodeHref(node.id)}
                  onClick={onNavigate}
                  title={node.name}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`min-w-0 flex-1 py-1 pr-2 ${node.kind === 'unit' ? 'font-medium' : ''} ${
                    node.kind === 'topic' ? 'truncate' : 'line-clamp-2 leading-snug'
                  }`}
                >
                  {node.name}
                </a>
              </div>
              {hasChildren && isOpen && renderLevel(node.id, depth + 1)}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <aside
      aria-label="Subject contents"
      className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-4 md:flex"
    >
      {subject ? (
        <>
          <a
            href={nodeHref(subject.id)}
            onClick={onNavigate}
            className="mb-3 block px-2 text-[15px] font-semibold tracking-tight"
          >
            {subject.name}
          </a>
          {syllabus.children.has(subject.id) ? (
            <div role="tree" aria-label={`${subject.name} contents`}>
              {renderLevel(subject.id, 0)}
            </div>
          ) : (
            <p className="px-2 text-[12.5px] text-muted">
              No units yet.{' '}
              <a href={nodeHref(subject.id)} className="underline">
                Add one
              </a>
            </p>
          )}
        </>
      ) : (
        <p className={`${ui.muted} px-2`}>
          Choose a subject to see its units, chapters and topics.
        </p>
      )}
    </aside>
  )
}

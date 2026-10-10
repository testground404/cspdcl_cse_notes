import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type SyllabusNode } from '../../db/db'
import { getPath } from '../../db/repo'
import { extractSubtopics } from '../../lib/markdown'
import { nodeHref, type Route } from '../../app/route'

const EXPANDED_KEY = 'tree-expanded'

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveExpanded(set: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]))
  } catch {
    // Storage unavailable: expansion just won't be remembered.
  }
}

export function Sidebar({ route, onNavigate }: { route: Route; onNavigate: () => void }) {
  const nodes = useLiveQuery(() => db.nodes.toArray(), [])
  const subtopicsByTopic = useLiveQuery(async () => {
    const notes = await db.notes.toArray()
    return new Map(notes.map((n) => [n.topicId, extractSubtopics(n.body)]))
  }, [])
  const [expanded, setExpanded] = useState(loadExpanded)

  // Open whatever is selected and its ancestors, so it and its children are visible.
  useEffect(() => {
    if (!route.nodeId) return
    getPath(route.nodeId).then((path) => {
      setExpanded((prev) => {
        const ancestors = path.map((n) => n.id)
        if (ancestors.every((id) => prev.has(id))) return prev
        const next = new Set([...prev, ...ancestors])
        saveExpanded(next)
        return next
      })
    })
  }, [route.nodeId])

  if (!nodes) return null

  const byParent = new Map<string | null, SyllabusNode[]>()
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? []
    list.push(n)
    byParent.set(n.parentId, list)
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveExpanded(next)
      return next
    })

  const renderLevel = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? []
    if (!children.length) return null
    return (
      <ul role={depth === 0 ? 'tree' : 'group'}>
        {children.map((node) => {
          const subtopics = node.kind === 'topic' ? (subtopicsByTopic?.get(node.id) ?? []) : []
          const hasChildren = node.kind === 'topic' ? subtopics.length > 0 : byParent.has(node.id)
          const isOpen = expanded.has(node.id)
          const isSelected = route.nodeId === node.id && !route.subtopic
          return (
            <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
              <div
                className={`flex items-center rounded text-sm ${
                  isSelected
                    ? 'bg-indigo-100 font-medium text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={{ paddingLeft: depth * 12 }}
              >
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className={`flex h-7 w-6 shrink-0 items-center justify-center text-slate-400 ${
                    hasChildren ? '' : 'invisible'
                  }`}
                  aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  tabIndex={hasChildren ? 0 : -1}
                >
                  <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </button>
                <a
                  href={nodeHref(node.id)}
                  onClick={onNavigate}
                  className="min-w-0 flex-1 truncate py-1 pr-2"
                  title={node.name}
                >
                  {node.kind === 'topic' && <span className="mr-1 text-slate-400">•</span>}
                  {node.name}
                </a>
              </div>
              {isOpen &&
                (node.kind === 'topic' ? (
                  <ul role="group">
                    {subtopics.map((s, i) => (
                      <li key={`${s.slug}-${i}`}>
                        <a
                          href={nodeHref(node.id, s.slug)}
                          onClick={onNavigate}
                          className={`block truncate rounded py-1 pr-2 text-xs ${
                            route.nodeId === node.id && route.subtopic === s.slug
                              ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                          style={{ paddingLeft: (depth + 1) * 12 + 24 }}
                          title={s.title}
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  renderLevel(node.id, depth + 1)
                ))}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div>
      {renderLevel(null, 0) ?? (
        <p className="px-2 text-sm text-slate-500">No subjects yet. Add one from Home.</p>
      )}
    </div>
  )
}

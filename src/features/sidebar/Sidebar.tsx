import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Download, Moon, Sun, Upload } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { db, type SyllabusNode } from '../../db/db'
import { extractSubtopics, renderInlineMarkdown } from '../../lib/markdown'
import { nodeHref, type Route } from '../../app/route'
import { readLocal, writeLocal } from '../../app/storage'
import { useTheme } from '../../app/theme'
import type { Syllabus } from '../../app/useSyllabus'
import { ui } from '../../ui/styles'
import { useBackup } from '../backup/useBackup'
import { useHighlights } from '../highlights/useHighlights'

const EXPANDED_KEY = 'tree-expanded'
const SECTIONS_KEY = 'sidebar-sections'

type SectionId = 'highlights' | 'tests' | 'notes'

function Section({
  id,
  title,
  href,
  open,
  onToggle,
  active,
  children,
}: {
  id: SectionId
  title: string
  href: string
  open: boolean
  onToggle: (id: SectionId) => void
  active: boolean
  children: ReactNode
}) {
  return (
    <section className="mb-5">
      <div className="group flex items-center px-2">
        <a
          href={href}
          className={`${ui.sectionLabel} flex-1 py-1 hover:text-ink ${active ? 'text-ink' : ''}`}
        >
          {title}
        </a>
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          aria-expanded={open}
          className="rounded p-1 text-muted opacity-60 group-hover:opacity-100 hover:bg-hover"
        >
          <ChevronRight
            size={13}
            className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          />
        </button>
      </div>
      {open && <div className="mt-1">{children}</div>}
    </section>
  )
}

const rowClass = (selected: boolean) =>
  `flex items-center rounded-md text-[13px] ${
    selected ? 'bg-hover font-medium text-ink' : 'text-ink/80 hover:bg-hover hover:text-ink'
  }`

export function Sidebar({
  route,
  syllabus,
  onNavigate,
}: {
  route: Route
  syllabus: Syllabus
  onNavigate: () => void
}) {
  const [sections, setSections] = useState<Record<SectionId, boolean>>(() =>
    readLocal(SECTIONS_KEY, { highlights: true, tests: true, notes: true }),
  )
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(readLocal<string[]>(EXPANDED_KEY, [])),
  )
  const highlights = useHighlights()
  const subtopicsByTopic = useLiveQuery(async () => {
    const notes = await db.notes.toArray()
    return new Map(notes.map((n) => [n.topicId, extractSubtopics(n.body)]))
  }, [])
  const attempts = useLiveQuery(
    () => db.attempts.orderBy('finishedAt').reverse().limit(3).toArray(),
    [],
  )
  const [theme, toggleTheme] = useTheme()
  const { download, restoreInput, chooseRestoreFile } = useBackup()

  const selectedId = route.page === 'node' ? route.nodeId : null
  const selectedSubtopic = route.page === 'node' ? route.subtopic : null

  // Open whatever is selected and its ancestors, so it and its children are visible.
  const selectedPath = syllabus.path(selectedId).map((n) => n.id)
  const missing = selectedPath.filter((id) => !expanded.has(id))
  if (missing.length) {
    const next = new Set([...expanded, ...missing])
    writeLocal(EXPANDED_KEY, [...next])
    setExpanded(next)
  }

  const toggleSection = (id: SectionId) => {
    const next = { ...sections, [id]: !sections[id] }
    writeLocal(SECTIONS_KEY, next)
    setSections(next)
  }
  const toggleNode = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    writeLocal(EXPANDED_KEY, [...next])
    setExpanded(next)
  }

  const renderTree = (parentId: string | null, depth: number): ReactNode => {
    const children = syllabus.children.get(parentId) ?? []
    if (!children.length) return null
    return (
      <ul role={depth === 0 ? 'tree' : 'group'}>
        {children.map((node: SyllabusNode) => {
          const subtopics = node.kind === 'topic' ? (subtopicsByTopic?.get(node.id) ?? []) : []
          const hasChildren =
            node.kind === 'topic' ? subtopics.length > 0 : syllabus.children.has(node.id)
          const isOpen = expanded.has(node.id)
          return (
            <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
              <div
                className={rowClass(selectedId === node.id && !selectedSubtopic)}
                style={{ paddingLeft: depth * 12 }}
              >
                <button
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  className={`flex h-7 w-6 shrink-0 items-center justify-center text-muted ${
                    hasChildren ? '' : 'invisible'
                  }`}
                  aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  tabIndex={hasChildren ? 0 : -1}
                >
                  <ChevronRight
                    size={13}
                    className={`transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
                  />
                </button>
                <a
                  href={nodeHref(node.id)}
                  onClick={onNavigate}
                  className="min-w-0 flex-1 truncate py-1 pr-2"
                  title={node.name}
                >
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
                          className={`${rowClass(
                            selectedId === node.id && selectedSubtopic === s.slug,
                          )} truncate py-1 pr-2 text-[12px] text-muted`}
                          style={{ paddingLeft: (depth + 1) * 12 + 24 }}
                          title={s.title}
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  renderTree(node.id, depth + 1)
                ))}
            </li>
          )
        })}
      </ul>
    )
  }

  const recentHighlights = [...(highlights ?? [])].sort((a, b) => b.time - a.time).slice(0, 4)

  return (
    <div className="flex h-full flex-col">
      <a
        href="#/"
        onClick={onNavigate}
        className="mb-6 block px-2 pt-1 text-[15px] font-semibold tracking-tight"
      >
        CSPDCL CSE Notes
      </a>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section
          id="highlights"
          title="Highlights"
          href="#/highlights"
          open={sections.highlights}
          onToggle={toggleSection}
          active={route.page === 'highlights'}
        >
          {recentHighlights.length ? (
            <ul>
              {recentHighlights.map((h) => (
                <li key={h.key}>
                  <a
                    href={h.href ?? '#/highlights'}
                    onClick={onNavigate}
                    className={`${rowClass(false)} line-clamp-2 px-2 py-1 text-[12.5px] leading-snug text-muted`}
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(h.text) }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-1 text-[12.5px] text-muted">Nothing highlighted yet.</p>
          )}
          <a
            href="#/highlights"
            onClick={onNavigate}
            className="block px-2 py-1 text-[12.5px] text-muted hover:text-ink"
          >
            All highlights →
          </a>
        </Section>

        <Section
          id="tests"
          title="Tests"
          href="#/tests"
          open={sections.tests}
          onToggle={toggleSection}
          active={route.page === 'tests' || route.page === 'bank'}
        >
          <a
            href="#/tests"
            onClick={onNavigate}
            className={`${rowClass(route.page === 'tests')} px-2 py-1`}
          >
            Start a test
          </a>
          <a
            href="#/tests/bank"
            onClick={onNavigate}
            className={`${rowClass(route.page === 'bank')} px-2 py-1`}
          >
            Question bank
          </a>
          {attempts?.map((a) => {
            const right = a.answers.filter((x) => x.correct).length
            return (
              <div key={a.id} className="flex justify-between px-2 py-0.5 text-[12px] text-muted">
                <span className="truncate pr-2">{a.scopeName}</span>
                <span className="tabular-nums">
                  {right}/{a.answers.length}
                </span>
              </div>
            )
          })}
        </Section>

        <Section
          id="notes"
          title="Notes"
          href="#/"
          open={sections.notes}
          onToggle={toggleSection}
          active={route.page === 'home'}
        >
          {renderTree(null, 0) ?? <p className="px-2 text-[12.5px] text-muted">No subjects yet.</p>}
        </Section>
      </div>

      <div className="flex items-center gap-1 border-t border-line pt-2">
        <button
          type="button"
          onClick={download}
          className={`${ui.button} text-xs text-muted`}
          title="Download all data as a file"
        >
          <Download size={14} /> Backup
        </button>
        <button
          type="button"
          onClick={chooseRestoreFile}
          className={`${ui.button} text-xs text-muted`}
        >
          <Upload size={14} /> Restore
        </button>
        {restoreInput}
        <button
          type="button"
          onClick={toggleTheme}
          className={`${ui.button} ml-auto text-muted`}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </div>
  )
}

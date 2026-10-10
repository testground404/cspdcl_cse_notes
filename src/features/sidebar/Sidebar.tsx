import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Download, Moon, Sun, Upload } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { db } from '../../db/db'
import { renderInlineMarkdown } from '../../lib/markdown'
import { nodeHref, type Route } from '../../app/route'
import { readLocal, writeLocal } from '../../app/storage'
import { useTheme } from '../../app/theme'
import type { Syllabus } from '../../app/useSyllabus'
import { ui } from '../../ui/styles'
import { useBackup } from '../backup/useBackup'
import { useHighlights } from '../highlights/useHighlights'

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
  const highlights = useHighlights()
  const attempts = useLiveQuery(
    () => db.attempts.orderBy('finishedAt').reverse().limit(3).toArray(),
    [],
  )
  const [theme, toggleTheme] = useTheme()
  const { download, restoreInput, chooseRestoreFile } = useBackup()

  // Highlight the subject that the current page belongs to.
  const currentSubject = route.page === 'node' ? syllabus.subjectOf(route.nodeId)?.id : undefined
  const subjects = syllabus.children.get(null) ?? []

  const toggleSection = (id: SectionId) => {
    const next = { ...sections, [id]: !sections[id] }
    writeLocal(SECTIONS_KEY, next)
    setSections(next)
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
          {subjects.length ? (
            <ul>
              {subjects.map((subject) => (
                <li key={subject.id}>
                  <a
                    href={nodeHref(subject.id)}
                    onClick={onNavigate}
                    title={subject.name}
                    aria-current={currentSubject === subject.id ? 'page' : undefined}
                    className={`${rowClass(currentSubject === subject.id)} truncate px-2 py-1`}
                  >
                    {subject.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 text-[12.5px] text-muted">No subjects yet.</p>
          )}
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

import { ChevronDown, Download, Menu as MenuIcon, Moon, Sun, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { nodeHref, type Route } from '../../app/route'
import { useTheme } from '../../app/theme'
import type { Syllabus } from '../../app/useSyllabus'
import { ui } from '../../ui/styles'
import { useBackup } from '../backup/useBackup'

const CLOSE_DELAY_MS = 200

const navLink = (active: boolean) =>
  `rounded-md px-2.5 py-1.5 text-sm ${
    active ? 'font-medium text-ink' : 'text-muted hover:text-ink'
  }`

function SubjectLinks({
  syllabus,
  currentSubject,
  onNavigate,
}: {
  syllabus: Syllabus
  currentSubject: string | undefined
  onNavigate: () => void
}) {
  const subjects = syllabus.children.get(null) ?? []
  return (
    <>
      {subjects.length ? (
        <ul>
          {subjects.map((s) => (
            <li key={s.id}>
              <a
                href={nodeHref(s.id)}
                onClick={onNavigate}
                title={s.name}
                aria-current={currentSubject === s.id ? 'page' : undefined}
                className={`block truncate rounded-md px-3 py-1.5 text-sm hover:bg-hover ${
                  currentSubject === s.id ? 'bg-hover font-medium' : ''
                }`}
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-1.5 text-sm text-muted">No subjects yet.</p>
      )}
      <a
        href="#/"
        onClick={onNavigate}
        className="mt-1 block border-t border-line px-3 pt-2 pb-1 text-xs text-muted hover:text-ink"
      >
        All subjects, add a subject
      </a>
    </>
  )
}

/**
 * "Notes ▾" with the subject list. Opens on mouse hover, and on click, tap or keyboard so it
 * also works where there is no hover.
 */
function NotesMenu({
  syllabus,
  active,
  currentSubject,
}: {
  syllabus: Syllabus
  active: boolean
  currentSubject: string | undefined
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const cancelClose = () => window.clearTimeout(timer.current)
  const closeSoon = () => {
    cancelClose()
    timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  useEffect(() => cancelClose, [])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        cancelClose()
        setOpen(true)
      }}
      onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
      onBlur={(e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="notes-menu"
        // After hovering, a mouse click should not slam the menu shut again.
        onClick={(e) =>
          (e.nativeEvent as PointerEvent).pointerType === 'mouse'
            ? setOpen(true)
            : setOpen((o) => !o)
        }
        className={`${navLink(active)} inline-flex items-center gap-1`}
      >
        Notes
        <ChevronDown
          size={14}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id="notes-menu" className="absolute top-full left-0 z-30 pt-1">
          <div className="max-h-[70vh] w-72 overflow-y-auto rounded-lg border border-line bg-canvas p-1 shadow-sm">
            <SubjectLinks
              syllabus={syllabus}
              currentSubject={currentSubject}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function TopBar({ route, syllabus }: { route: Route; syllabus: Syllabus | undefined }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const { download, restoreInput, chooseRestoreFile } = useBackup()

  const currentSubject = route.page === 'node' ? syllabus?.subjectOf(route.nodeId)?.id : undefined
  const notesActive = route.page === 'home' || route.page === 'node'
  const closeMobile = () => setMobileOpen(false)

  const actions = (
    <>
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
      <button
        type="button"
        onClick={toggleTheme}
        className={`${ui.button} text-muted`}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </>
  )

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 md:px-4">
      <button
        type="button"
        className="rounded-md p-1.5 text-muted hover:bg-hover md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? (
          <X size={20} strokeWidth={1.75} />
        ) : (
          <MenuIcon size={20} strokeWidth={1.75} />
        )}
      </button>
      <a href="#/" onClick={closeMobile} className="mr-4 text-[15px] font-semibold tracking-tight">
        CSPDCL CSE Notes
      </a>

      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        <a
          href="#/highlights"
          className={navLink(route.page === 'highlights')}
          aria-current={route.page === 'highlights' ? 'page' : undefined}
        >
          Highlights
        </a>
        <a
          href="#/tests"
          className={navLink(route.page === 'tests' || route.page === 'bank')}
          aria-current={route.page === 'tests' || route.page === 'bank' ? 'page' : undefined}
        >
          Tests
        </a>
        {syllabus && (
          <NotesMenu syllabus={syllabus} active={notesActive} currentSubject={currentSubject} />
        )}
      </nav>

      <div className="ml-auto hidden items-center gap-1 md:flex">{actions}</div>
      {restoreInput}

      {mobileOpen && (
        <div className="fixed inset-x-0 top-12 bottom-0 z-30 overflow-y-auto bg-canvas p-4 md:hidden">
          <nav aria-label="Main (mobile)" className="mb-4 flex flex-col">
            <a
              href="#/highlights"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-[15px] hover:bg-hover"
            >
              Highlights
            </a>
            <a
              href="#/tests"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-[15px] hover:bg-hover"
            >
              Tests
            </a>
          </nav>
          <h2 className={`${ui.sectionLabel} mb-1 px-3`}>Notes</h2>
          {syllabus && (
            <SubjectLinks
              syllabus={syllabus}
              currentSubject={currentSubject}
              onNavigate={closeMobile}
            />
          )}
          <div className="mt-6 flex items-center gap-1 border-t border-line pt-3">{actions}</div>
        </div>
      )}
    </header>
  )
}

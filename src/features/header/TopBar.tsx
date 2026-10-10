import {
  ChevronDown,
  Download,
  Infinity as Logo,
  Menu as MenuIcon,
  Moon,
  Sun,
  Upload,
  User,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { nodeHref, type Route } from '../../app/route'
import { useTheme } from '../../app/theme'
import type { Syllabus } from '../../app/useSyllabus'
import { HoverPopover } from '../../ui/Popover'
import { ui } from '../../ui/styles'
import { useBackup } from '../backup/useBackup'

export const APP_NAME = 'Synapse Notes'

const navLink = (active: boolean) =>
  `py-1 text-[14px] transition-colors ${
    active ? 'font-semibold text-ink' : 'font-normal text-muted hover:text-ink'
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
                className={`block truncate rounded-md px-3 py-1.5 text-[13px] hover:bg-hover ${
                  currentSubject === s.id ? 'bg-hover font-semibold text-ink' : 'text-body'
                }`}
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-1.5 text-[13px] text-muted">No subjects yet.</p>
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

const panelBox = 'rounded-xl border border-line bg-canvas p-1.5 shadow-lg'

export function TopBar({ route, syllabus }: { route: Route; syllabus: Syllabus | undefined }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const { download, restoreInput, chooseRestoreFile } = useBackup()

  const currentSubject = route.page === 'node' ? syllabus?.subjectOf(route.nodeId)?.id : undefined
  const notesActive = route.page === 'home' || route.page === 'node'
  const testActive = route.page === 'tests' || route.page === 'bank'
  const closeMobile = () => setMobileOpen(false)

  const itemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] text-body hover:bg-hover hover:text-ink'

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-canvas/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-max items-center gap-2">
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
        <a href="#/" onClick={closeMobile} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-inverse shadow-sm">
            <Logo size={19} strokeWidth={2} />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">{APP_NAME}</span>
        </a>
      </div>

      <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
        {syllabus && (
          <HoverPopover
            id="notes-menu"
            buttonClassName={`${navLink(notesActive)} inline-flex items-center gap-1`}
            button={(open) => (
              <>
                Notes
                <ChevronDown
                  size={14}
                  className={`text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                />
              </>
            )}
          >
            {(close) => (
              <div className={`${panelBox} max-h-[70vh] w-72 overflow-y-auto`}>
                <SubjectLinks
                  syllabus={syllabus}
                  currentSubject={currentSubject}
                  onNavigate={close}
                />
              </div>
            )}
          </HoverPopover>
        )}
        <a
          href="#/tests"
          className={navLink(testActive)}
          aria-current={testActive ? 'page' : undefined}
        >
          Test
        </a>
        <a
          href="#/highlights"
          className={navLink(route.page === 'highlights')}
          aria-current={route.page === 'highlights' ? 'page' : undefined}
        >
          Highlights
        </a>
      </nav>

      <div className="flex min-w-max items-center">
        <HoverPopover
          id="account-menu"
          label="Account and settings"
          align="right"
          buttonClassName="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-soft text-ink transition-colors hover:bg-ink hover:text-inverse"
          button={() => <User size={17} strokeWidth={1.75} />}
        >
          {(close) => (
            <div className={`${panelBox} w-52`}>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  close()
                  void download()
                }}
              >
                <Download size={15} /> Back up everything
              </button>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  close()
                  chooseRestoreFile()
                }}
              >
                <Upload size={15} /> Restore a backup
              </button>
              <button
                type="button"
                className={`${itemClass} border-t border-line`}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          )}
        </HoverPopover>
        {restoreInput}
      </div>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-canvas p-4 md:hidden">
          <nav aria-label="Main (mobile)" className="mb-4 flex flex-col">
            <a
              href="#/tests"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-[15px] hover:bg-hover"
            >
              Test
            </a>
            <a
              href="#/highlights"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-[15px] hover:bg-hover"
            >
              Highlights
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
        </div>
      )}
    </header>
  )
}

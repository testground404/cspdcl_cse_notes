import { Menu as MenuIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CHILD_KIND } from '../db/db'
import { seedIfEmpty } from '../db/seed'
import { LAST_BACKUP_KEY } from '../features/backup/useBackup'
import { HighlightsPage } from '../features/highlights/HighlightsPage'
import { ChildList } from '../features/nodes/ChildList'
import { NodeHeader } from '../features/nodes/NodeHeader'
import { TopicNote } from '../features/notes/TopicNote'
import { Sidebar } from '../features/sidebar/Sidebar'
import { QuestionBankPage } from '../features/tests/QuestionBankPage'
import { TestsPage } from '../features/tests/TestsPage'
import { ui } from '../ui/styles'
import { useRoute, type Route } from './route'
import { readLocal } from './storage'
import { useSyllabus, type Syllabus } from './useSyllabus'

function Home({ syllabus }: { syllabus: Syllabus }) {
  const lastBackup = readLocal<string | null>(LAST_BACKUP_KEY, null)
  return (
    <div>
      <h1 className={`${ui.h1} mb-2`}>Notes</h1>
      <p className={`${ui.muted} mb-8 max-w-2xl`}>
        Subject › Unit › Chapter › Topic. Each topic has one note; its <code>##</code> headings are
        subtopics. Everything is saved in this browser. Last backup:{' '}
        {lastBackup ? new Date(lastBackup).toLocaleDateString() : 'never'}.
      </p>
      <ChildList parentId={null} childKind="subject" syllabus={syllabus} />
    </div>
  )
}

function NodePage({
  route,
  syllabus,
}: {
  route: Extract<Route, { page: 'node' }>
  syllabus: Syllabus
}) {
  const node = syllabus.nodes.get(route.nodeId)
  if (!node) {
    return (
      <p className={ui.muted}>
        This item no longer exists.{' '}
        <a href="#/" className="underline">
          Back to notes
        </a>
      </p>
    )
  }
  const childKind = CHILD_KIND[node.kind]
  if (!childKind) {
    return (
      <TopicNote
        key={node.id}
        topicId={node.id}
        subtopic={route.subtopic}
        highlight={route.highlight}
        renderHeader={(actions) => (
          <NodeHeader key={node.id} node={node} syllabus={syllabus} actions={actions} />
        )}
      />
    )
  }
  return (
    <div>
      <NodeHeader key={node.id} node={node} syllabus={syllabus} />
      <ChildList parentId={node.id} childKind={childKind} syllabus={syllabus} />
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const syllabus = useSyllabus()
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    void navigator.storage?.persist?.()
    seedIfEmpty().finally(() => setReady(true))
  }, [])

  // Start each page at the top unless it jumps to a subtopic or highlight.
  const pageKey = route.page === 'node' ? route.nodeId : route.page
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [pageKey])

  const loaded = ready && syllabus

  return (
    <div className="flex h-full bg-canvas text-ink">
      {menuOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/20 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
      <nav
        aria-label="Sidebar"
        className={`${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-20 w-72 bg-panel px-3 py-4 transition-transform duration-150 md:static md:w-64 md:translate-x-0`}
      >
        {loaded && (
          <Sidebar route={route} syllabus={syllabus} onNavigate={() => setMenuOpen(false)} />
        )}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-4 pt-3 md:hidden">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted hover:bg-hover"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={20} strokeWidth={1.75} />
          </button>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-24 md:px-12 md:pt-12">
          <div className="mx-auto max-w-5xl">
            {loaded &&
              (route.page === 'node' ? (
                <NodePage route={route} syllabus={syllabus} />
              ) : route.page === 'highlights' ? (
                <HighlightsPage syllabus={syllabus} />
              ) : route.page === 'tests' ? (
                <TestsPage syllabus={syllabus} />
              ) : route.page === 'bank' ? (
                <QuestionBankPage syllabus={syllabus} />
              ) : (
                <Home syllabus={syllabus} />
              ))}
          </div>
        </main>
      </div>
    </div>
  )
}

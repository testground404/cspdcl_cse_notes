import { useEffect, useState, type ReactNode } from 'react'
import { CHILD_KIND } from '../db/db'
import { seedIfEmpty } from '../db/seed'
import { LAST_BACKUP_KEY } from '../features/backup/useBackup'
import { HighlightsPage } from '../features/highlights/HighlightsPage'
import { ChildList } from '../features/nodes/ChildList'
import { NodeHeader } from '../features/nodes/NodeHeader'
import { TopicNote } from '../features/notes/TopicNote'
import { TopBar } from '../features/header/TopBar'
import { TreePanel } from '../features/tree/TreePanel'
import { QuestionBankPage } from '../features/tests/QuestionBankPage'
import { TestsPage } from '../features/tests/TestsPage'
import { ui } from '../ui/styles'
import { useRoute, type Route } from './route'
import { readLocal } from './storage'
import { useSyllabus, type Syllabus } from './useSyllabus'

function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pt-6 pb-24 md:px-10 md:pt-10">
      <div className="max-w-5xl">{children}</div>
    </div>
  )
}

function Home({ syllabus }: { syllabus: Syllabus }) {
  const lastBackup = readLocal<string | null>(LAST_BACKUP_KEY, null)
  return (
    <div>
      <h1 className={`${ui.h1Large} mb-2`}>Notes</h1>
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
        node={node}
        syllabus={syllabus}
        subtopic={route.subtopic}
        highlight={route.highlight}
      />
    )
  }
  return (
    <PageContainer>
      <NodeHeader key={node.id} node={node} syllabus={syllabus} />
      <ChildList parentId={node.id} childKind={childKind} syllabus={syllabus} />
    </PageContainer>
  )
}

export default function App() {
  const route = useRoute()
  const syllabus = useSyllabus()
  const [ready, setReady] = useState(false)

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
    <div className="flex h-full flex-col bg-canvas text-ink">
      <TopBar route={route} syllabus={loaded ? syllabus : undefined} />
      <div className="flex min-h-0 flex-1">
        {loaded && <TreePanel route={route} syllabus={syllabus} />}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {loaded &&
            (route.page === 'node' ? (
              <NodePage route={route} syllabus={syllabus} />
            ) : (
              <PageContainer>
                {route.page === 'highlights' ? (
                  <HighlightsPage syllabus={syllabus} />
                ) : route.page === 'tests' ? (
                  <TestsPage
                    key={route.scopeId ?? ''}
                    syllabus={syllabus}
                    scopeId={route.scopeId}
                  />
                ) : route.page === 'bank' ? (
                  <QuestionBankPage syllabus={syllabus} />
                ) : (
                  <Home syllabus={syllabus} />
                )}
              </PageContainer>
            ))}
        </main>
      </div>
    </div>
  )
}

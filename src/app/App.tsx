import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { CHILD_KIND, db } from '../db/db'
import { seedIfEmpty } from '../db/seed'
import { BackupButtons, LAST_BACKUP_KEY } from '../features/backup/BackupButtons'
import { ChildList } from '../features/nodes/ChildList'
import { NodeHeader } from '../features/nodes/NodeHeader'
import { TopicNote } from '../features/notes/TopicNote'
import { Sidebar } from '../features/tree/Sidebar'
import { useRoute, type Route } from './route'

function Home() {
  let lastBackup: string | null = null
  try {
    lastBackup = localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    // ignore
  }
  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Home</h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Organise notes as Subject → Unit → Chapter → Topic. Each topic has one note, and the{' '}
        <code>##</code> headings inside it are its subtopics. Notes are saved in this browser
        automatically.{' '}
        <strong>
          Use Backup regularly
          {lastBackup
            ? ` (last: ${new Date(lastBackup).toLocaleDateString()})`
            : ' (never done yet)'}
        </strong>
        : clearing browser data deletes your notes.
      </p>
      <ChildList parentId={null} childKind="subject" />
    </div>
  )
}

function NodePage({ route }: { route: Route }) {
  const node = useLiveQuery(
    async () => (route.nodeId ? ((await db.nodes.get(route.nodeId)) ?? null) : null),
    [route.nodeId],
  )
  if (node === undefined) return null
  if (node === null) {
    return (
      <p className="text-sm text-slate-500">
        This item no longer exists.{' '}
        <a href="#/" className="text-indigo-600 underline">
          Go home
        </a>
      </p>
    )
  }
  const childKind = CHILD_KIND[node.kind]
  return (
    <div className="flex min-h-full flex-col">
      <NodeHeader key={node.id} node={node} />
      {childKind ? (
        <ChildList parentId={node.id} childKind={childKind} />
      ) : (
        <TopicNote key={node.id} topicId={node.id} subtopic={route.subtopic} />
      )}
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    void navigator.storage?.persist?.()
    seedIfEmpty().finally(() => setReady(true))
  }, [])

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <button
          type="button"
          className="rounded px-2 py-1 text-lg md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle syllabus menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
        <h1 className="flex-1 truncate text-lg font-semibold">
          <a href="#/">CSPDCL CSE Notes</a>
        </h1>
        <BackupButtons />
      </header>
      <div className="relative flex min-h-0 flex-1">
        <nav
          aria-label="Syllabus"
          className={`${
            menuOpen ? 'block' : 'hidden'
          } absolute inset-y-0 left-0 z-10 w-72 overflow-y-auto border-r border-slate-200 bg-white p-2 shadow-lg md:static md:block md:shadow-none dark:border-slate-800 dark:bg-slate-950`}
        >
          {ready && <Sidebar route={route} onNavigate={() => setMenuOpen(false)} />}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {ready && (route.nodeId ? <NodePage route={route} /> : <Home />)}
        </main>
      </div>
    </div>
  )
}

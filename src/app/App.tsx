import syllabus from '../seed/syllabus.json'

export default function App() {
  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h1 className="text-lg font-semibold">CSPDCL CSE Notes</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Syllabus"
          className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 p-3 md:block dark:border-slate-800"
        >
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Subjects
          </h2>
          <ul className="space-y-1">
            {syllabus.subjects.map((subject) => (
              <li
                key={subject}
                className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                {subject}
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex flex-1 items-center justify-center p-6 text-slate-500">
          <p>Select a subject to start writing notes.</p>
        </main>
      </div>
    </div>
  )
}

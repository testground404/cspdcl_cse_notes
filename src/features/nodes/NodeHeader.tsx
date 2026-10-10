import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { KIND_LABEL, type SyllabusNode } from '../../db/db'
import { deleteNode, getPath, moveNode, renameNode } from '../../db/repo'
import { nodeHref } from '../../app/route'

const btn =
  'rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'

/** Breadcrumb, title and the rename / reorder / delete actions for any node. */
export function NodeHeader({ node }: { node: SyllabusNode }) {
  const path = useLiveQuery(() => getPath(node.id), [node.id, node.name]) ?? []
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(node.name)

  const startEdit = () => {
    setName(node.name)
    setEditing(true)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) await renameNode(node.id, name)
    setEditing(false)
  }
  const remove = async () => {
    const what = node.kind === 'topic' ? 'this topic and its note' : 'it and everything inside it'
    if (!window.confirm(`Delete "${node.name}"? This deletes ${what}.`)) return
    await deleteNode(node.id)
    window.location.hash = node.parentId ? nodeHref(node.parentId) : '#/'
  }

  return (
    <div className="mb-4">
      <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap gap-1 text-xs text-slate-500">
        <a href="#/" className="hover:underline">
          Home
        </a>
        {path.slice(0, -1).map((p) => (
          <span key={p.id} className="flex gap-1">
            <span>/</span>
            <a href={nodeHref(p.id)} className="hover:underline">
              {p.name}
            </a>
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
          {KIND_LABEL[node.kind]}
        </span>
        {editing ? (
          <form onSubmit={submit} className="flex flex-1 gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
              aria-label="Name"
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-lg font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" className={btn}>
              Save
            </button>
            <button type="button" className={btn} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h2 className="min-w-0 flex-1 text-xl font-semibold break-words">{node.name}</h2>
            <div className="flex gap-1">
              <button type="button" className={btn} onClick={startEdit}>
                Rename
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => moveNode(node.id, -1)}
                aria-label="Move up"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => moveNode(node.id, 1)}
                aria-label="Move down"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className={`${btn} text-red-600 dark:text-red-400`}
                onClick={remove}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

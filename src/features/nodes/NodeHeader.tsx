import { useState, type FormEvent, type ReactNode } from 'react'
import type { SyllabusNode } from '../../db/db'
import { deleteNode, moveNode, renameNode } from '../../db/repo'
import { nodeHref } from '../../app/route'
import type { Syllabus } from '../../app/useSyllabus'
import { Menu } from '../../ui/Menu'
import { ui } from '../../ui/styles'

/** Breadcrumb, title, optional actions, and a ⋯ menu with rename / move / delete. */
export function NodeHeader({
  node,
  syllabus,
  actions,
  large = false,
  subtitle,
}: {
  node: SyllabusNode
  syllabus: Syllabus
  actions?: ReactNode
  /** The big page-title style used at the top of a note. */
  large?: boolean
  subtitle?: string
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(node.name)
  const ancestors = syllabus.path(node.id).slice(0, -1)

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
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap gap-1.5 text-xs text-muted">
        <a href="#/" className="hover:text-ink">
          Notes
        </a>
        {ancestors.map((p) => (
          <span key={p.id} className="flex gap-1.5">
            <span aria-hidden>›</span>
            <a href={nodeHref(p.id)} className="hover:text-ink">
              {p.name}
            </a>
          </span>
        ))}
      </nav>
      {editing ? (
        <form onSubmit={submit} className="flex max-w-xl gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            aria-label="Name"
            className={`${ui.input} text-lg font-semibold`}
          />
          <button type="submit" className={ui.primary}>
            Save
          </button>
          <button type="button" className={ui.button} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-start gap-2">
          <h1 className={`${large ? ui.h1Large : ui.h1} min-w-0 flex-1 break-words`}>
            {node.name}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <Menu
              items={[
                {
                  label: 'Rename',
                  onSelect: () => {
                    setName(node.name)
                    setEditing(true)
                  },
                },
                { label: 'Move up', onSelect: () => void moveNode(node.id, -1) },
                { label: 'Move down', onSelect: () => void moveNode(node.id, 1) },
                { label: 'Delete…', onSelect: () => void remove(), danger: true },
              ]}
            />
          </div>
        </div>
      )}
      {subtitle && !editing && (
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-body">{subtitle}</p>
      )}
    </header>
  )
}

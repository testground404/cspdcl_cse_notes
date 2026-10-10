import { CHILD_KIND, KIND_LABEL, type NodeKind } from '../../db/db'
import { addNode } from '../../db/repo'
import { nodeHref } from '../../app/route'
import type { Syllabus } from '../../app/useSyllabus'
import { AddForm } from './AddForm'

/** The children of a node (or the subjects when parentId is null), with an add link. */
export function ChildList({
  parentId,
  childKind,
  syllabus,
}: {
  parentId: string | null
  childKind: NodeKind
  syllabus: Syllabus
}) {
  const children = syllabus.children.get(parentId) ?? []
  const label = KIND_LABEL[childKind].toLowerCase()
  const grandchild = CHILD_KIND[childKind]

  return (
    <section className="max-w-2xl">
      {children.length > 0 ? (
        <ul className="mb-3">
          {children.map((c) => {
            const count = syllabus.children.get(c.id)?.length ?? 0
            return (
              <li key={c.id}>
                <a
                  href={nodeHref(c.id)}
                  className="-mx-2 flex items-baseline justify-between rounded-md px-2 py-2 hover:bg-hover"
                >
                  <span>{c.name}</span>
                  {grandchild && (
                    <span className="text-xs text-muted tabular-nums">
                      {count} {KIND_LABEL[grandchild].toLowerCase()}
                      {count === 1 ? '' : 's'}
                    </span>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-2 text-sm text-muted">No {label}s yet.</p>
      )}
      <AddForm
        label={`Add ${label}`}
        placeholder={`New ${label} name`}
        onAdd={(name) => addNode(parentId, name).then(() => undefined)}
      />
    </section>
  )
}

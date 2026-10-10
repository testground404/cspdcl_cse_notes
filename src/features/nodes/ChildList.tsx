import { useLiveQuery } from 'dexie-react-hooks'
import { CHILD_KIND, KIND_LABEL, type NodeKind } from '../../db/db'
import { addNode, getChildren } from '../../db/repo'
import { nodeHref } from '../../app/route'
import { AddForm } from './AddForm'

/** Lists the children of a parent (or the subjects when parentId is null) with an add form. */
export function ChildList({
  parentId,
  childKind,
}: {
  parentId: string | null
  childKind: NodeKind
}) {
  const children = useLiveQuery(() => getChildren(parentId), [parentId])
  const counts = useLiveQuery(async () => {
    if (!children || !CHILD_KIND[childKind]) return new Map<string, number>()
    const entries = await Promise.all(
      children.map(async (c) => [c.id, (await getChildren(c.id)).length] as const),
    )
    return new Map(entries)
  }, [children, childKind])
  const label = KIND_LABEL[childKind]
  const grandchild = CHILD_KIND[childKind]

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-500">{label}s</h3>
      {children && children.length > 0 ? (
        <ul className="mb-4 divide-y divide-slate-200 rounded border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {children.map((c) => (
            <li key={c.id}>
              <a
                href={nodeHref(c.id)}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span>{c.name}</span>
                {grandchild && (
                  <span className="text-xs text-slate-500">
                    {counts?.get(c.id) ?? 0} {KIND_LABEL[grandchild].toLowerCase()}
                    {counts?.get(c.id) === 1 ? '' : 's'}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-500">No {label.toLowerCase()}s yet.</p>
      )}
      <AddForm
        placeholder={`New ${label.toLowerCase()} name`}
        buttonLabel={`Add ${label.toLowerCase()}`}
        onAdd={(name) => addNode(parentId, name).then(() => undefined)}
      />
    </section>
  )
}

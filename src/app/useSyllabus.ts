import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SyllabusNode } from '../db/db'

export interface Syllabus {
  nodes: Map<string, SyllabusNode>
  children: Map<string | null, SyllabusNode[]>
  /** Node names from the subject down to the node itself. */
  path: (id: string | null) => SyllabusNode[]
  /** "Subject › Unit › …" label for a node. */
  label: (id: string | null) => string
  /** The subject a node belongs to. */
  subjectOf: (id: string | null) => SyllabusNode | undefined
  /** Every node in tree order (depth-first), for pickers. */
  ordered: SyllabusNode[]
}

export function buildSyllabus(list: SyllabusNode[]): Syllabus {
  const nodes = new Map(list.map((n) => [n.id, n]))
  const children = new Map<string | null, SyllabusNode[]>()
  for (const n of list) {
    const siblings = children.get(n.parentId) ?? []
    siblings.push(n)
    children.set(n.parentId, siblings)
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.order - b.order)

  const path = (id: string | null) => {
    const result: SyllabusNode[] = []
    let current = id ? nodes.get(id) : undefined
    while (current) {
      result.unshift(current)
      current = current.parentId ? nodes.get(current.parentId) : undefined
    }
    return result
  }
  const ordered: SyllabusNode[] = []
  const walk = (parentId: string | null) => {
    for (const n of children.get(parentId) ?? []) {
      ordered.push(n)
      walk(n.id)
    }
  }
  walk(null)

  return {
    nodes,
    children,
    path,
    label: (id) =>
      path(id)
        .map((n) => n.name)
        .join(' › '),
    subjectOf: (id) => path(id)[0],
    ordered,
  }
}

export function useSyllabus(): Syllabus | undefined {
  return useLiveQuery(async () => buildSyllabus(await db.nodes.toArray()), [])
}

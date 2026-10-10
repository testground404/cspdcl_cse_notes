import { CHILD_KIND, db, type Note, type NodeKind, type SyllabusNode } from './db'

const newId = () => crypto.randomUUID()

export async function getChildren(parentId: string | null): Promise<SyllabusNode[]> {
  const rows =
    parentId === null
      ? await db.nodes.filter((n) => n.parentId === null).toArray()
      : await db.nodes.where('parentId').equals(parentId).toArray()
  return rows.sort((a, b) => a.order - b.order)
}

export async function addNode(parentId: string | null, name: string): Promise<SyllabusNode> {
  let kind: NodeKind = 'subject'
  if (parentId !== null) {
    const parent = await db.nodes.get(parentId)
    const child = parent && CHILD_KIND[parent.kind]
    if (!child) throw new Error('This item cannot have children')
    kind = child
  }
  const siblings = await getChildren(parentId)
  const node: SyllabusNode = {
    id: newId(),
    parentId,
    kind,
    name: name.trim(),
    order: siblings.length ? siblings[siblings.length - 1].order + 1 : 0,
  }
  await db.nodes.add(node)
  return node
}

export async function renameNode(id: string, name: string) {
  await db.nodes.update(id, { name: name.trim() })
}

async function collectDescendants(id: string): Promise<string[]> {
  const children = await db.nodes.where('parentId').equals(id).primaryKeys()
  const nested = await Promise.all(children.map(collectDescendants))
  return [id, ...nested.flat()]
}

/** Deletes the node, everything under it, and the notes of any topics removed. */
export async function deleteNode(id: string) {
  await db.transaction('rw', db.nodes, db.notes, async () => {
    const ids = await collectDescendants(id)
    await db.nodes.bulkDelete(ids)
    await db.notes.bulkDelete(ids)
  })
}

/** Swaps the node with its previous (-1) or next (+1) sibling. */
export async function moveNode(id: string, direction: -1 | 1) {
  await db.transaction('rw', db.nodes, async () => {
    const node = await db.nodes.get(id)
    if (!node) return
    const siblings = await getChildren(node.parentId)
    const i = siblings.findIndex((s) => s.id === id)
    const other = siblings[i + direction]
    if (!other) return
    await db.nodes.update(node.id, { order: other.order })
    await db.nodes.update(other.id, { order: node.order })
  })
}

export async function getPath(id: string): Promise<SyllabusNode[]> {
  const path: SyllabusNode[] = []
  let current = await db.nodes.get(id)
  while (current) {
    path.unshift(current)
    current = current.parentId ? await db.nodes.get(current.parentId) : undefined
  }
  return path
}

export async function saveNote(topicId: string, body: string) {
  await db.notes.put({ topicId, body, updatedAt: Date.now() })
}

export interface Backup {
  app: 'cspdcl-cse-notes'
  version: 1
  exportedAt: string
  nodes: SyllabusNode[]
  notes: Note[]
}

export async function exportBackup(): Promise<Backup> {
  const [nodes, notes] = await Promise.all([db.nodes.toArray(), db.notes.toArray()])
  return { app: 'cspdcl-cse-notes', version: 1, exportedAt: new Date().toISOString(), nodes, notes }
}

/** Replaces all data with the backup's contents. */
export async function importBackup(data: unknown) {
  const backup = data as Partial<Backup>
  if (
    backup?.app !== 'cspdcl-cse-notes' ||
    !Array.isArray(backup.nodes) ||
    !Array.isArray(backup.notes)
  ) {
    throw new Error('This file is not a CSPDCL CSE Notes backup.')
  }
  await db.transaction('rw', db.nodes, db.notes, async () => {
    await db.nodes.clear()
    await db.notes.clear()
    await db.nodes.bulkAdd(backup.nodes!)
    await db.notes.bulkAdd(backup.notes!)
  })
}

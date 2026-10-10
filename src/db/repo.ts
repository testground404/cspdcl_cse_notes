import {
  CHILD_KIND,
  db,
  type KeyPoint,
  type Note,
  type NodeKind,
  type Question,
  type SyllabusNode,
  type TestAttempt,
} from './db'

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

/** The node's id and the ids of everything under it. */
export async function getSubtreeIds(id: string): Promise<Set<string>> {
  return new Set(await collectDescendants(id))
}

/**
 * Deletes the node, everything under it, and the notes of any topics removed. Key points and
 * questions filed there are kept but become unfiled, so no written work is lost.
 */
export async function deleteNode(id: string) {
  await db.transaction('rw', [db.nodes, db.notes, db.keyPoints, db.questions], async () => {
    const ids = await collectDescendants(id)
    await db.nodes.bulkDelete(ids)
    await db.notes.bulkDelete(ids)
    await db.keyPoints.where('nodeId').anyOf(ids).modify({ nodeId: null })
    await db.questions.where('nodeId').anyOf(ids).modify({ nodeId: null })
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

export async function addKeyPoint(text: string, nodeId: string | null) {
  await db.keyPoints.add({ id: newId(), nodeId, text: text.trim(), createdAt: Date.now() })
}

export async function updateKeyPoint(
  id: string,
  changes: Partial<Pick<KeyPoint, 'text' | 'nodeId'>>,
) {
  await db.keyPoints.update(id, changes)
}

export async function deleteKeyPoint(id: string) {
  await db.keyPoints.delete(id)
}

export type QuestionInput = Pick<
  Question,
  'nodeId' | 'text' | 'options' | 'correct' | 'explanation'
>

export function validateQuestion(q: QuestionInput): string | null {
  if (!q.text.trim()) return 'Write the question.'
  const options = q.options.map((o) => o.trim())
  if (options.length < 2 || options.some((o) => !o))
    return 'Fill in at least two options, with no empty ones.'
  if (q.correct < 0 || q.correct >= options.length) return 'Choose the correct option.'
  return null
}

export async function saveQuestion(input: QuestionInput, id?: string): Promise<string> {
  const error = validateQuestion(input)
  if (error) throw new Error(error)
  const now = Date.now()
  const data = {
    nodeId: input.nodeId,
    text: input.text.trim(),
    options: input.options.map((o) => o.trim()),
    correct: input.correct,
    explanation: input.explanation.trim(),
    updatedAt: now,
  }
  if (id) {
    await db.questions.update(id, data)
    return id
  }
  const newQ: Question = { id: newId(), createdAt: now, ...data }
  await db.questions.add(newQ)
  return newQ.id
}

export async function deleteQuestion(id: string) {
  await db.questions.delete(id)
}

/** Questions filed under the scope node or anywhere beneath it (all questions when null). */
export async function getQuestionsInScope(scopeId: string | null): Promise<Question[]> {
  if (scopeId === null) return db.questions.toArray()
  const ids = [...(await getSubtreeIds(scopeId))]
  return db.questions.where('nodeId').anyOf(ids).toArray()
}

export async function saveAttempt(attempt: Omit<TestAttempt, 'id'>): Promise<string> {
  const id = newId()
  await db.attempts.add({ id, ...attempt })
  return id
}

export interface Backup {
  app: 'cspdcl-cse-notes'
  version: 2
  exportedAt: string
  nodes: SyllabusNode[]
  notes: Note[]
  keyPoints: KeyPoint[]
  questions: Question[]
  attempts: TestAttempt[]
}

export async function exportBackup(): Promise<Backup> {
  const [nodes, notes, keyPoints, questions, attempts] = await Promise.all([
    db.nodes.toArray(),
    db.notes.toArray(),
    db.keyPoints.toArray(),
    db.questions.toArray(),
    db.attempts.toArray(),
  ])
  return {
    app: 'cspdcl-cse-notes',
    version: 2,
    exportedAt: new Date().toISOString(),
    nodes,
    notes,
    keyPoints,
    questions,
    attempts,
  }
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
  // Version 1 backups have no key points, questions or test results.
  const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : [])
  const tables = [db.nodes, db.notes, db.keyPoints, db.questions, db.attempts]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await db.nodes.bulkAdd(backup.nodes!)
    await db.notes.bulkAdd(backup.notes!)
    await db.keyPoints.bulkAdd(list(backup.keyPoints))
    await db.questions.bulkAdd(list(backup.questions))
    await db.attempts.bulkAdd(list(backup.attempts))
  })
}

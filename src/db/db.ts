import Dexie, { type EntityTable } from 'dexie'

export type NodeKind = 'subject' | 'unit' | 'chapter' | 'topic'

/** Each kind can only contain the next kind down; topics hold the note. */
export const CHILD_KIND: Record<NodeKind, NodeKind | null> = {
  subject: 'unit',
  unit: 'chapter',
  chapter: 'topic',
  topic: null,
}

export const KIND_LABEL: Record<NodeKind, string> = {
  subject: 'Subject',
  unit: 'Unit',
  chapter: 'Chapter',
  topic: 'Topic',
}

export interface SyllabusNode {
  id: string
  parentId: string | null
  kind: NodeKind
  name: string
  order: number
}

export interface Note {
  topicId: string
  body: string
  updatedAt: number
}

export const db = new Dexie('cspdcl-cse-notes') as Dexie & {
  nodes: EntityTable<SyllabusNode, 'id'>
  notes: EntityTable<Note, 'topicId'>
}

db.version(1).stores({
  nodes: '&id, parentId, kind',
  notes: '&topicId, updatedAt',
})

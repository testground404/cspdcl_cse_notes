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

/** A short point written directly, optionally attached to a syllabus node. */
export interface KeyPoint {
  id: string
  nodeId: string | null
  text: string
  createdAt: number
}

/** A multiple-choice question in the question bank, filed under any syllabus node. */
export interface Question {
  id: string
  nodeId: string | null
  text: string
  options: string[]
  correct: number
  explanation: string
  createdAt: number
  updatedAt: number
}

export interface TestAnswer {
  questionId: string
  chosen: number
  correct: boolean
}

export interface TestAttempt {
  id: string
  /** null = the whole syllabus. */
  scopeId: string | null
  scopeName: string
  startedAt: number
  finishedAt: number
  answers: TestAnswer[]
}

export const db = new Dexie('cspdcl-cse-notes') as Dexie & {
  nodes: EntityTable<SyllabusNode, 'id'>
  notes: EntityTable<Note, 'topicId'>
  keyPoints: EntityTable<KeyPoint, 'id'>
  questions: EntityTable<Question, 'id'>
  attempts: EntityTable<TestAttempt, 'id'>
}

db.version(1).stores({
  nodes: '&id, parentId, kind',
  notes: '&topicId, updatedAt',
})

db.version(2).stores({
  keyPoints: '&id, nodeId, createdAt',
  questions: '&id, nodeId, createdAt',
  attempts: '&id, finishedAt',
})

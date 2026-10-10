import { beforeEach, describe, expect, test } from 'vitest'
import { db } from './db'
import {
  addKeyPoint,
  addNode,
  deleteNode,
  exportBackup,
  getChildren,
  getPath,
  importBackup,
  getQuestionsInScope,
  moveNode,
  saveAttempt,
  saveNote,
  saveQuestion,
  validateQuestion,
} from './repo'
import { seedIfEmpty } from './seed'

beforeEach(async () => {
  await Promise.all(
    [db.nodes, db.notes, db.keyPoints, db.questions, db.attempts].map((t) => t.clear()),
  )
})

async function makeTopic() {
  const subject = await addNode(null, 'Operating Systems')
  const unit = await addNode(subject.id, 'Unit 1')
  const chapter = await addNode(unit.id, 'Scheduling')
  const topic = await addNode(chapter.id, 'Round Robin')
  return { subject, unit, chapter, topic }
}

describe('hierarchy', () => {
  test('children get the next kind down: subject → unit → chapter → topic', async () => {
    const { subject, unit, chapter, topic } = await makeTopic()
    expect([subject.kind, unit.kind, chapter.kind, topic.kind]).toEqual([
      'subject',
      'unit',
      'chapter',
      'topic',
    ])
    await expect(addNode(topic.id, 'too deep')).rejects.toThrow()
    expect((await getPath(topic.id)).map((n) => n.name)).toEqual([
      'Operating Systems',
      'Unit 1',
      'Scheduling',
      'Round Robin',
    ])
  })

  test('deleting a node removes its descendants and their notes', async () => {
    const { subject, unit, topic } = await makeTopic()
    const other = await addNode(subject.id, 'Unit 2')
    await saveNote(topic.id, '## A')
    await deleteNode(unit.id)
    expect(await db.nodes.count()).toBe(2)
    expect(await db.notes.count()).toBe(0)
    expect((await getChildren(subject.id)).map((n) => n.id)).toEqual([other.id])
  })

  test('moveNode swaps order with a sibling and stops at the ends', async () => {
    const a = await addNode(null, 'A')
    const b = await addNode(null, 'B')
    await moveNode(b.id, -1)
    expect((await getChildren(null)).map((n) => n.name)).toEqual(['B', 'A'])
    await moveNode(b.id, -1)
    expect((await getChildren(null)).map((n) => n.name)).toEqual(['B', 'A'])
    await moveNode(a.id, -1)
    expect((await getChildren(null)).map((n) => n.name)).toEqual(['A', 'B'])
  })
})

describe('backup', () => {
  test('export then import restores the same data', async () => {
    const { topic } = await makeTopic()
    await saveNote(topic.id, '## FCFS\ntext')
    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await deleteNode((await getChildren(null))[0].id)
    expect(await db.nodes.count()).toBe(0)
    await importBackup(backup)
    expect(await db.nodes.count()).toBe(4)
    expect((await db.notes.get(topic.id))?.body).toBe('## FCFS\ntext')
  })

  test('rejects files that are not backups', async () => {
    await expect(importBackup({ foo: 1 })).rejects.toThrow(/not a CSPDCL/)
  })
})

test('seedIfEmpty seeds once', async () => {
  await seedIfEmpty()
  const count = await db.nodes.count()
  expect(count).toBeGreaterThan(10)
  await seedIfEmpty()
  expect(await db.nodes.count()).toBe(count)
})

describe('question bank and key points', () => {
  test('scope includes questions filed anywhere underneath', async () => {
    const { subject, chapter, topic } = await makeTopic()
    const other = await addNode(null, 'DBMS')
    const base = { text: 'Q?', options: ['a', 'b'], correct: 0, explanation: '' }
    await saveQuestion({ ...base, nodeId: chapter.id })
    await saveQuestion({ ...base, nodeId: topic.id })
    await saveQuestion({ ...base, nodeId: other.id })
    await saveQuestion({ ...base, nodeId: null })
    expect(await getQuestionsInScope(subject.id)).toHaveLength(2)
    expect(await getQuestionsInScope(topic.id)).toHaveLength(1)
    expect(await getQuestionsInScope(null)).toHaveLength(4)
  })

  test('rejects incomplete questions', async () => {
    await expect(
      saveQuestion({ nodeId: null, text: 'Q?', options: ['a', ' '], correct: 0, explanation: '' }),
    ).rejects.toThrow(/two options/)
    expect(
      validateQuestion({
        nodeId: null,
        text: ' ',
        options: ['a', 'b'],
        correct: 0,
        explanation: '',
      }),
    ).toMatch(/question/)
  })

  test('deleting a node keeps its key points and questions, unfiled', async () => {
    const { subject, topic } = await makeTopic()
    await addKeyPoint('remember this', topic.id)
    await saveQuestion({
      nodeId: topic.id,
      text: 'Q?',
      options: ['a', 'b'],
      correct: 1,
      explanation: '',
    })
    await deleteNode(subject.id)
    expect((await db.keyPoints.toArray()).map((k) => k.nodeId)).toEqual([null])
    expect((await db.questions.toArray()).map((q) => q.nodeId)).toEqual([null])
  })

  test('backups include key points, questions and results; v1 backups still import', async () => {
    const { topic } = await makeTopic()
    await addKeyPoint('kp', topic.id)
    const qid = await saveQuestion({
      nodeId: topic.id,
      text: 'Q?',
      options: ['a', 'b'],
      correct: 0,
      explanation: '',
    })
    await saveAttempt({
      scopeId: null,
      scopeName: 'All',
      startedAt: 1,
      finishedAt: 2,
      answers: [{ questionId: qid, chosen: 0, correct: true }],
    })
    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await importBackup({
      ...backup,
      version: 1,
      keyPoints: undefined,
      questions: undefined,
      attempts: undefined,
    })
    expect(await db.questions.count()).toBe(0)
    await importBackup(backup)
    expect([
      await db.keyPoints.count(),
      await db.questions.count(),
      await db.attempts.count(),
    ]).toEqual([1, 1, 1])
  })
})

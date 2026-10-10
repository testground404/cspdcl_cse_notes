import { beforeEach, describe, expect, test } from 'vitest'
import { db } from './db'
import {
  addNode,
  deleteNode,
  exportBackup,
  getChildren,
  getPath,
  importBackup,
  moveNode,
  saveNote,
} from './repo'
import { seedIfEmpty } from './seed'

beforeEach(async () => {
  await db.nodes.clear()
  await db.notes.clear()
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

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { extractHighlights } from '../../lib/markdown'
import { highlightHref, nodeHref } from '../../app/route'

export interface HighlightItem {
  key: string
  kind: 'mark' | 'point'
  text: string
  /** Topic (for marks) or the node the key point is filed under; null if unfiled. */
  nodeId: string | null
  subtopicTitle: string | null
  href: string | null
  /** Used for "recent" ordering: the note's last edit, or when the key point was written. */
  time: number
  /** Key point id, for editing and deleting. */
  pointId?: string
}

/** All marked passages in notes plus all key points. */
export function useHighlights(): HighlightItem[] | undefined {
  return useLiveQuery(async () => {
    const [notes, points] = await Promise.all([db.notes.toArray(), db.keyPoints.toArray()])
    const items: HighlightItem[] = []
    for (const note of notes) {
      for (const h of extractHighlights(note.body)) {
        items.push({
          key: `${note.topicId}:${h.index}`,
          kind: 'mark',
          text: h.text,
          nodeId: note.topicId,
          subtopicTitle: h.subtopic?.title ?? null,
          href: highlightHref(note.topicId, h.index),
          time: note.updatedAt,
        })
      }
    }
    for (const p of points) {
      items.push({
        key: `kp:${p.id}`,
        kind: 'point',
        text: p.text,
        nodeId: p.nodeId,
        subtopicTitle: null,
        href: p.nodeId ? nodeHref(p.nodeId) : null,
        time: p.createdAt,
        pointId: p.id,
      })
    }
    return items
  }, [])
}
